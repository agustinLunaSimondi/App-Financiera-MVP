from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
import asyncio
import logging
import httpx

from app.database import models
from app.database.database import get_db
from app.core.deps import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/analytics", tags=["analytics"])

# Cache en memoria para datos macro externos (dólar blue, IPC).
# TTL de 1h: estos números no cambian intra-hora y no queremos pegarle a APIs
# públicas en cada request del dashboard.
_macro_cache: dict = {"data": None, "expires_at": None}
_macro_lock = asyncio.Lock()
_MACRO_TTL_SECONDS = 3600

@router.get("/kpis")
def get_kpis(
    startDate: Optional[date] = None,
    endDate: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # 1. Balance Total — agrupado por moneda. Sin tipo de cambio confiable es engañoso sumar.
    accounts = db.query(models.Account).filter(models.Account.user_id == current_user.id).all()
    balance_by_currency: dict = {}
    for acc in accounts:
        cur = (acc.currency or "USD").upper()
        balance_by_currency[cur] = balance_by_currency.get(cur, Decimal("0")) + Decimal(str(acc.balance or 0))

    # Heurística: si el user solo tiene una moneda, devolvemos `totalBalance` flat para compat con UI.
    if len(balance_by_currency) == 1:
        primary_cur, primary_total = next(iter(balance_by_currency.items()))
        total_balance = float(primary_total)
    else:
        primary_cur = current_user.currency or "USD"
        total_balance = float(balance_by_currency.get(primary_cur.upper(), Decimal("0")))

    # 2. Ingresos del periodo
    income_query = db.query(func.sum(models.Transaction.amount)).join(models.Account).filter(
        models.Account.user_id == current_user.id,
        models.Transaction.amount > 0
    )

    # 3. Gastos del periodo
    expense_query = db.query(func.sum(models.Transaction.amount)).join(models.Account).filter(
        models.Account.user_id == current_user.id,
        models.Transaction.amount < 0
    )

    if startDate:
        income_query = income_query.filter(models.Transaction.transaction_date >= startDate)
        expense_query = expense_query.filter(models.Transaction.transaction_date >= startDate)
    if endDate:
        income_query = income_query.filter(models.Transaction.transaction_date <= endDate)
        expense_query = expense_query.filter(models.Transaction.transaction_date <= endDate)

    period_income = income_query.scalar() or 0
    period_expenses = abs(expense_query.scalar() or 0)
    net_savings = float(period_income) - float(period_expenses)

    return {
        "totalBalance": total_balance,
        "primaryCurrency": primary_cur,
        "balanceByCurrency": {k: float(v) for k, v in balance_by_currency.items()},
        "periodIncome": float(period_income),
        "periodExpenses": float(period_expenses),
        "netSavings": net_savings,
    }

@router.get("/breakdown")
def get_breakdown(
    startDate: Optional[date] = None,
    endDate: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    query = db.query(
        models.Category.name,
        models.Category.color,
        func.sum(func.abs(models.Transaction.amount)).label("value")
    ).join(models.Transaction).join(models.Account).filter(
        models.Account.user_id == current_user.id,
        models.Transaction.amount < 0
    )
    
    if startDate:
        query = query.filter(models.Transaction.transaction_date >= startDate)
    if endDate:
        query = query.filter(models.Transaction.transaction_date <= endDate)
        
    results = query.group_by(models.Category.id).order_by(func.sum(func.abs(models.Transaction.amount)).desc()).all()
    
    return [{"name": r.name, "value": float(r.value), "color": r.color} for r in results]

@router.get("/cashflow")
def get_cashflow(
    months: int = 6,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Simplificado: obtener transacciones y agrupar en Python o usar SQL complejo
    # Usaremos una consulta de agregación por mes
    results = db.query(
        func.to_char(models.Transaction.transaction_date, 'YYYY-MM').label('month'),
        func.sum(func.case((models.Transaction.amount > 0, models.Transaction.amount), else_=0)).label('income'),
        func.sum(func.case((models.Transaction.amount < 0, func.abs(models.Transaction.amount)), else_=0)).label('expenses')
    ).join(models.Account).filter(
        models.Account.user_id == current_user.id
    ).group_by('month').order_by('month').all()
    
    return [{"month": r.month, "income": float(r.income), "expenses": float(r.expenses)} for r in results[-months:]]


async def _fetch_macro_data() -> dict:
    """
    Obtiene cotización del dólar blue y última inflación mensual publicada.
    Fuentes:
      - bluelytics.com.ar  (dólar oficial + blue)
      - argentinadatos.com (IPC histórico de INDEC, scrapeado)
    Cacheado 1h en memoria. Si una fuente falla, devolvemos lo que tengamos.
    """
    result = {"usd_blue": None, "usd_oficial": None, "ipc_month_pct": None, "ipc_month": None, "last_updated": None}

    async with httpx.AsyncClient(timeout=8.0) as client:
        try:
            r = await client.get("https://api.bluelytics.com.ar/v2/latest")
            if r.status_code == 200:
                data = r.json()
                result["usd_blue"] = float(data["blue"]["value_sell"])
                result["usd_oficial"] = float(data["oficial"]["value_sell"])
                result["last_updated"] = data.get("last_update")
        except Exception as e:
            logger.warning(f"bluelytics falló: {e}")

        try:
            r = await client.get("https://api.argentinadatos.com/v1/finanzas/indices/inflacion")
            if r.status_code == 200:
                data = r.json()
                if data:
                    last = data[-1]
                    result["ipc_month_pct"] = float(last.get("valor", 0))
                    result["ipc_month"] = last.get("fecha")
        except Exception as e:
            logger.warning(f"argentinadatos IPC falló: {e}")

    return result


@router.get("/inflation-context")
async def get_inflation_context(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Devuelve contexto macro AR + gastos del mes del usuario expresados en pesos y USD blue.
    Diseñado para alimentar el panel "Tu plata con inflación real" del dashboard.
    """
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).date()

    # Lock para evitar que N requests simultáneos peguen a bluelytics/IPC en paralelo.
    async with _macro_lock:
        if (
            _macro_cache["data"] is not None
            and _macro_cache["expires_at"] is not None
            and _macro_cache["expires_at"] > now
        ):
            macro = _macro_cache["data"]
        else:
            macro = await _fetch_macro_data()
            _macro_cache["data"] = macro
            _macro_cache["expires_at"] = now + timedelta(seconds=_MACRO_TTL_SECONDS)

    expenses_month_q = db.query(func.sum(func.abs(models.Transaction.amount))).join(models.Account).filter(
        models.Account.user_id == current_user.id,
        models.Transaction.amount < 0,
        models.Transaction.transaction_date >= month_start,
    )
    expenses_month = float(expenses_month_q.scalar() or 0)

    last_month_start = (month_start - timedelta(days=1)).replace(day=1)
    last_month_end = month_start - timedelta(days=1)
    expenses_last_month_q = db.query(func.sum(func.abs(models.Transaction.amount))).join(models.Account).filter(
        models.Account.user_id == current_user.id,
        models.Transaction.amount < 0,
        models.Transaction.transaction_date >= last_month_start,
        models.Transaction.transaction_date <= last_month_end,
    )
    expenses_last_month = float(expenses_last_month_q.scalar() or 0)

    usd_blue = macro.get("usd_blue")
    ipc_pct = macro.get("ipc_month_pct")

    expenses_month_usd = (expenses_month / usd_blue) if usd_blue else None

    # Variación real = nominal − IPC del mes anterior (proxy si no tenemos IPC del mes actual aún)
    real_variation_pct = None
    if expenses_last_month > 0 and ipc_pct is not None:
        nominal_pct = ((expenses_month - expenses_last_month) / expenses_last_month) * 100
        real_variation_pct = nominal_pct - ipc_pct

    return {
        "month": month_start.isoformat(),
        "expenses_month_ars": expenses_month,
        "expenses_last_month_ars": expenses_last_month,
        "expenses_month_usd": expenses_month_usd,
        "usd_blue": usd_blue,
        "usd_oficial": macro.get("usd_oficial"),
        "ipc_last_month_pct": ipc_pct,
        "ipc_month_ref": macro.get("ipc_month"),
        "real_variation_pct": real_variation_pct,
        "last_macro_update": macro.get("last_updated"),
    }
