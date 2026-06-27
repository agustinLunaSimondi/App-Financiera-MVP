"""
Servicio de sincronización con Mercado Pago.
Maneja el intercambio OAuth, refresh de tokens y sincronización de pagos.
"""
import httpx
import os
import logging
from datetime import datetime, timezone, date, timedelta
from decimal import Decimal
from typing import Optional
from sqlalchemy.orm import Session

from app.database import models

logger = logging.getLogger(__name__)

MP_API_BASE = "https://api.mercadopago.com"
MP_OAUTH_URL = f"{MP_API_BASE}/oauth/token"

# MP opera en horario de Argentina (UTC-3, sin DST). Sus filtros de fecha
# esperan un ISO-8601 con offset; mandar UTC etiquetado como -03:00 corre la
# ventana 3 horas y se pierden/duplican pagos en los bordes del mes.
AR_TZ = timezone(timedelta(hours=-3))

# Tope defensivo de paginación para no iterar de forma ilimitada si MP devuelve
# un `paging.total` inconsistente.
_MAX_PAGES = 20


def _fmt_mp_datetime(dt: datetime) -> str:
    """Formatea un datetime tz-aware al ISO con offset AR que espera el filtro de MP."""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(AR_TZ).isoformat(timespec="milliseconds")


def _net_amount(payment: dict) -> Decimal:
    """
    Monto efectivo del pago descontando reembolsos parciales/totales.
    MP deja el pago en status `approved` aunque haya sido reembolsado en parte;
    `transaction_amount` queda con el valor original, así que sin restar
    `transaction_amount_refunded` inflamos ingresos/egresos.
    """
    amount = Decimal(str(payment.get("transaction_amount", 0) or 0))
    refunded = Decimal(str(payment.get("transaction_amount_refunded", 0) or 0))
    net = amount - refunded
    return net if net > 0 else Decimal("0")


def get_mp_config():
    """Obtener configuración de Mercado Pago desde variables de entorno."""
    client_id = os.getenv("MP_CLIENT_ID")
    client_secret = os.getenv("MP_CLIENT_SECRET")
    redirect_uri = os.getenv("MP_REDIRECT_URI")
    env = os.getenv("APP_ENV", "development").lower()

    if not client_id or not client_secret:
        raise ValueError("MP_CLIENT_ID y MP_CLIENT_SECRET deben estar configurados en .env")

    if not redirect_uri:
        if env in ("production", "prod"):
            # En producción no aceptamos un default a localhost — el OAuth de MP devolvería el code a un host irrelevante.
            raise ValueError("MP_REDIRECT_URI debe estar configurado en producción.")
        redirect_uri = "http://localhost:5173/integrations"

    return {
        "client_id": client_id,
        "client_secret": client_secret,
        "redirect_uri": redirect_uri,
    }


def get_auth_url() -> str:
    """Genera la URL de autorización OAuth de Mercado Pago."""
    from urllib.parse import quote
    config = get_mp_config()
    return (
        f"https://auth.mercadopago.com.ar/authorization"
        f"?client_id={config['client_id']}"
        f"&response_type=code"
        f"&platform_id=mp"
        f"&redirect_uri={quote(config['redirect_uri'], safe='')}"
    )


async def exchange_code_for_tokens(code: str) -> dict:
    """Intercambia el código de autorización por tokens de acceso."""
    config = get_mp_config()
    
    async with httpx.AsyncClient() as client:
        response = await client.post(MP_OAUTH_URL, json={
            "client_id": config["client_id"],
            "client_secret": config["client_secret"],
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": config["redirect_uri"],
        })
        
        if response.status_code != 200:
            logger.error(f"Error intercambiando código OAuth: {response.status_code} - {response.text}")
            raise ValueError(f"Error de Mercado Pago: {response.json().get('message', 'Error desconocido')}")
        
        data = response.json()
        return {
            "access_token": data["access_token"],
            "refresh_token": data["refresh_token"],
            "user_id": str(data.get("user_id", "")),
            "expires_in": data.get("expires_in", 15552000),  # 180 days default
        }


async def refresh_access_token(connection: models.MercadoPagoConnection) -> dict:
    """Renueva el access token usando el refresh token."""
    config = get_mp_config()

    async with httpx.AsyncClient() as client:
        response = await client.post(MP_OAUTH_URL, json={
            "client_id": config["client_id"],
            "client_secret": config["client_secret"],
            "grant_type": "refresh_token",
            "refresh_token": connection.refresh_token,
        })

        if response.status_code != 200:
            logger.error(f"Error renovando token: {response.status_code} - {response.text}")
            raise ValueError("No se pudo renovar el token de MP. Reconectá tu cuenta.")

        data = response.json()
        access_token = data.get("access_token")
        # MP a veces devuelve el refresh_token vacío (rotation no aplicada). En ese caso preservamos el viejo.
        new_refresh = data.get("refresh_token") or connection.refresh_token
        if not access_token:
            raise ValueError("Respuesta inválida de MP — falta access_token.")
        return {
            "access_token": access_token,
            "refresh_token": new_refresh,
            "expires_in": data.get("expires_in", 15552000),
        }


def _is_expense(payment: dict, mp_user_id: str) -> bool:
    """
    Determina si un pago de MP es un egreso para el usuario.

    Fuente de verdad: collector_id. MP solo lo puebla cuando el usuario es el
    cobrador, así que:
      - collector_id == mp_user_id -> dinero entra -> INGRESO
        (transfers recibidas + account_fund / carga de saldo Debin)
      - collector_id nulo o de otro -> operación saliente -> EGRESO
        (compras, recargas, reservas, transfers enviadas)

    payer.id no es confiable: viene nulo en las operaciones salientes, que es
    justo donde lo necesitaríamos.
    """
    uid = str(mp_user_id or "")
    collector_id = str(payment.get("collector_id", "") or "")
    return not (uid and collector_id and collector_id == uid)


async def fetch_account_balance(access_token: str, mp_user_id: str = None) -> dict:
    """
    Obtiene el saldo e ingresos/egresos del mes de la cuenta Mercado Pago.
    Usa collector_id para distinguir correctamente egresos de ingresos.
    """
    try:
        now_ar = datetime.now(AR_TZ)
        month_start = now_ar.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        income_month = Decimal("0")
        expenses_month = Decimal("0")
        total_transactions = 0

        base_params = {
            "sort": "date_created",
            "criteria": "desc",
            "limit": 100,
            "range": "date_created",
            "begin_date": _fmt_mp_datetime(month_start),
            "end_date": _fmt_mp_datetime(now_ar),
        }

        async with httpx.AsyncClient(timeout=15.0) as client:
            offset = 0
            for _ in range(_MAX_PAGES):
                payments_response = await client.get(
                    f"{MP_API_BASE}/v1/payments/search",
                    params={**base_params, "offset": offset},
                    headers={"Authorization": f"Bearer {access_token}"},
                )
                if payments_response.status_code != 200:
                    logger.warning(
                        "MP balance: respuesta %s en offset %s", payments_response.status_code, offset
                    )
                    break

                data = payments_response.json()
                results = data.get("results", [])
                for payment in results:
                    if payment.get("status") != "approved":
                        continue
                    net = _net_amount(payment)
                    if net == 0:
                        continue
                    if _is_expense(payment, mp_user_id):
                        expenses_month += net
                    else:
                        income_month += net
                    total_transactions += 1

                offset += len(results)
                if not results or offset >= data.get("paging", {}).get("total", 0):
                    break

        return {
            "available_balance": float(income_month - expenses_month),
            "income_month": float(income_month),
            "expenses_month": float(expenses_month),
            "total_transactions_month": total_transactions,
        }
    except Exception as e:
        logger.warning(f"Error obteniendo balance de MP: {e}")
        return {
            "available_balance": 0.0,
            "income_month": 0.0,
            "expenses_month": 0.0,
            "total_transactions_month": 0,
        }


async def fetch_payments(
    access_token: str,
    since: Optional[datetime] = None,
    date_field: str = "date_created",
) -> list:
    """
    Obtiene pagos de la API de Mercado Pago.

    Si `since` está definido, busca pagos en esa ventana usando `date_field` como
    criterio de rango. Para sincronización incremental conviene `date_last_updated`:
    así un pago que estaba `pending` en la corrida anterior y luego pasó a
    `approved` vuelve a aparecer (su `date_created` quedó fuera de la ventana, pero
    su `date_last_updated` cae dentro) y la deduplicación por `external_id` evita
    duplicarlo.
    """
    params = {
        "sort": "date_created",
        "criteria": "desc",
        "limit": 100,
    }

    if since:
        params["begin_date"] = _fmt_mp_datetime(since)
        params["end_date"] = _fmt_mp_datetime(datetime.now(timezone.utc))
        params["range"] = date_field

    all_payments = []
    offset = 0
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        while True:
            params["offset"] = offset
            response = await client.get(
                f"{MP_API_BASE}/v1/payments/search",
                params=params,
                headers={"Authorization": f"Bearer {access_token}"}
            )
            
            if response.status_code == 401:
                raise ValueError("TOKEN_EXPIRED")
            
            if response.status_code != 200:
                logger.error(f"Error obteniendo pagos: {response.status_code} - {response.text}")
                break
            
            data = response.json()
            results = data.get("results", [])
            all_payments.extend(results)
            
            paging = data.get("paging", {})
            total = paging.get("total", 0)
            
            offset += len(results)
            if offset >= total or len(results) == 0:
                break
    
    return all_payments


def get_or_create_mp_account(db: Session, user: models.User) -> models.Account:
    """Obtiene o crea una cuenta 'Mercado Pago' para el usuario."""
    mp_account = db.query(models.Account).filter(
        models.Account.user_id == user.id,
        models.Account.name == "Mercado Pago",
    ).first()
    
    if not mp_account:
        mp_account = models.Account(
            user_id=user.id,
            name="Mercado Pago",
            type=models.AccountType.CHECKING,
            balance=Decimal("0"),
            currency="ARS",
        )
        db.add(mp_account)
        db.commit()
        db.refresh(mp_account)
        logger.info(f"Cuenta 'Mercado Pago' creada para usuario {user.id}")
    
    return mp_account


def get_or_create_mp_categories(db: Session, user: models.User) -> dict:
    """Obtiene o crea categorías de ingresos y egresos para Mercado Pago."""
    categories = {}
    
    category_defs = [
        {"name": "MP Cobros", "type": models.CategoryType.INCOME, "color": "#00b1ea", "icon": "trending-up"},
        {"name": "MP Pagos", "type": models.CategoryType.EXPENSE, "color": "#ff6b35", "icon": "credit-card"},
    ]
    
    for cat_def in category_defs:
        cat = db.query(models.Category).filter(
            models.Category.user_id == user.id,
            models.Category.name == cat_def["name"],
        ).first()
        
        if not cat:
            cat = models.Category(
                user_id=user.id,
                name=cat_def["name"],
                color=cat_def["color"],
                icon=cat_def["icon"],
                type=cat_def["type"],
                is_default=False,
            )
            db.add(cat)
            db.commit()
            db.refresh(cat)
        
        categories[cat_def["name"]] = cat
    
    return categories


def sync_payments_to_transactions(
    db: Session,
    user: models.User,
    payments: list,
    default_account_id: str,
    default_category_id: str,
    income_category_id: str = None,
    mp_user_id: str = None,
) -> dict:
    """
    Convierte pagos de MP en transacciones locales.
    Usa payer.id vs mp_user_id para distinguir egresos de ingresos.
    """
    imported = 0
    skipped = 0
    net_balance_delta = Decimal("0")

    for payment in payments:
        mp_payment_id = str(payment.get("id", ""))

        expense = _is_expense(payment, mp_user_id)
        logger.info(
            "MP classify id=%s op_type=%s status=%s amount=%s "
            "collector_id=%s payer_id=%s mp_user_id=%s description=%r -> %s",
            mp_payment_id,
            payment.get("operation_type"),
            payment.get("status"),
            payment.get("transaction_amount"),
            payment.get("collector_id"),
            payment.get("payer", {}).get("id"),
            mp_user_id,
            payment.get("description", ""),
            "EGRESO" if expense else "INGRESO",
        )

        if payment.get("status", "") != "approved":
            skipped += 1
            continue

        # Deduplicación
        if db.query(models.Transaction).filter(
            models.Transaction.external_id == f"mp_{mp_payment_id}",
        ).first():
            skipped += 1
            continue

        # Monto neto (descuenta reembolsos). Si quedó en 0 fue un wash → no se importa.
        raw_amount = _net_amount(payment)
        if raw_amount == 0:
            skipped += 1
            continue

        description_parts = []

        if expense:
            amount = -abs(raw_amount)
            description_parts.append("[MP Pago]")
            category_id = default_category_id
        else:
            amount = abs(raw_amount)
            description_parts.append("[MP Cobro]")
            category_id = income_category_id or default_category_id

        # Descripción legible
        mp_description = payment.get("description", "")
        payer_info = payment.get("payer", {})
        payer_email = payer_info.get("email", "")
        if mp_description:
            description_parts.append(mp_description)
        elif not expense and payer_email:
            # En cobros, mostrar quién pagó
            description_parts.append(f"De: {payer_email}")
        else:
            description_parts.append(f"Operación #{mp_payment_id}")

        description = " ".join(description_parts)

        date_str = payment.get("date_approved") or payment.get("date_created", "")
        try:
            tx_date = datetime.fromisoformat(date_str.replace("Z", "+00:00")).date()
        except (ValueError, AttributeError):
            tx_date = date.today()

        db.add(models.Transaction(
            account_id=default_account_id,
            category_id=category_id,
            amount=amount,
            description=description,
            transaction_date=tx_date,
            external_id=f"mp_{mp_payment_id}",
            source="mercadopago",
        ))
        net_balance_delta += amount
        imported += 1

    if imported > 0:
        try:
            account = db.query(models.Account).filter(
                models.Account.id == default_account_id
            ).first()
            if account:
                account.balance = (account.balance or Decimal("0")) + net_balance_delta
        except Exception as e:
            logger.warning(f"No se pudo actualizar balance de cuenta: {e}")
        db.commit()

    return {
        "transactions_imported": imported,
        "transactions_skipped": skipped,
        "message": f"Se importaron {imported} transacciones nuevas ({skipped} ya existían o estaban pendientes).",
    }
