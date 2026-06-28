"""
Servicio de sincronización con Belvo (agregador open banking LatAm).
A diferencia de Mercado Pago (OAuth con `code`), Belvo delega el login bancario
al Connect Widget en el frontend: nuestro backend nunca ve credenciales del
usuario, solo recibe un `link_id` ya creado y usa Basic Auth contra la API de
Belvo para leer cuentas y movimientos.
"""
import asyncio
import httpx
import os
import logging
from datetime import datetime, date, timezone
from decimal import Decimal
from typing import Optional
from sqlalchemy.orm import Session

from app.database import models
from app.database.database import SessionLocal

logger = logging.getLogger(__name__)

# Mapeo del campo `type` que Belvo devuelve en /api/accounts/ a nuestro AccountType.
_BELVO_ACCOUNT_TYPE_MAP = {
    "CHECKING_ACCOUNT": models.AccountType.CHECKING,
    "SAVINGS_ACCOUNT": models.AccountType.SAVINGS,
    "CREDIT_CARD": models.AccountType.CREDIT,
    "LOAN_ACCOUNT": models.AccountType.CREDIT,
}


def get_belvo_config() -> dict:
    """Obtener configuración de Belvo desde variables de entorno."""
    secret_id = os.getenv("BELVO_SECRET_ID")
    secret_password = os.getenv("BELVO_SECRET_PASSWORD")
    env = os.getenv("BELVO_ENV", "sandbox").lower()

    if not secret_id or not secret_password:
        raise ValueError("BELVO_SECRET_ID y BELVO_SECRET_PASSWORD deben estar configurados en .env")

    base_url = "https://sandbox.belvo.com" if env == "sandbox" else "https://api.belvo.com"

    return {
        "secret_id": secret_id,
        "secret_password": secret_password,
        "base_url": base_url,
    }


async def get_widget_token() -> dict:
    """
    Genera un access token de corta duración para inicializar el Belvo
    Connect Widget en el frontend. No se reusa: se pide uno nuevo por sesión
    de conexión.
    """
    config = get_belvo_config()

    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{config['base_url']}/api/token/",
            json={
                "id": config["secret_id"],
                "password": config["secret_password"],
                "scopes": "read_institutions,write_links,read_links",
                "widget": True,
            },
        )

        if response.status_code != 201:
            logger.error(f"Error generando widget token de Belvo: {response.status_code} - {response.text}")
            raise ValueError("No se pudo iniciar la conexión con Belvo.")

        return response.json()


async def fetch_accounts(link_id: str) -> list:
    """Obtiene las cuentas (cajas de ahorro, cuentas corrientes, tarjetas) de un link de Belvo."""
    config = get_belvo_config()

    async with httpx.AsyncClient(
        auth=(config["secret_id"], config["secret_password"]), timeout=30.0
    ) as client:
        response = await client.get(
            f"{config['base_url']}/api/accounts/",
            params={"link": link_id},
        )

        if response.status_code != 200:
            logger.error(f"Error obteniendo cuentas de Belvo: {response.status_code} - {response.text}")
            raise ValueError("No se pudieron obtener las cuentas del banco conectado.")

        data = response.json()
        return data.get("results", data) if isinstance(data, dict) else data


async def fetch_transactions(link_id: str, since: Optional[datetime] = None) -> list:
    """
    Obtiene movimientos de un link de Belvo.

    En la primera carga (sin `since`), Belvo puede responder 202 mientras
    procesa el histórico de forma asíncrona — en ese caso no hay resultados
    todavía y deben llegar luego vía webhook `historical_update`.
    """
    config = get_belvo_config()
    params = {"link": link_id}
    if since:
        params["date_from"] = since.date().isoformat()

    async with httpx.AsyncClient(
        auth=(config["secret_id"], config["secret_password"]), timeout=30.0
    ) as client:
        response = await client.get(f"{config['base_url']}/api/transactions/", params=params)

        if response.status_code == 202:
            logger.info(f"Belvo aún procesando histórico para link {link_id[:8]}...")
            return []

        if response.status_code != 200:
            logger.error(f"Error obteniendo transacciones de Belvo: {response.status_code} - {response.text}")
            raise ValueError("No se pudieron sincronizar los movimientos del banco conectado.")

        data = response.json()
        return data.get("results", data) if isinstance(data, dict) else data


def get_or_create_belvo_account(
    db: Session, user: models.User, belvo_account: dict, institution_name: str
) -> models.Account:
    """Obtiene o crea la cuenta local correspondiente a una cuenta de Belvo."""
    belvo_account_id = str(belvo_account.get("id", ""))
    account_name = f"{institution_name} - {belvo_account.get('name') or belvo_account.get('category', 'Cuenta')}"

    account = db.query(models.Account).filter(
        models.Account.user_id == user.id,
        models.Account.name == account_name,
    ).first()

    if not account:
        account_type = _BELVO_ACCOUNT_TYPE_MAP.get(
            belvo_account.get("category", ""), models.AccountType.CHECKING
        )
        account = models.Account(
            user_id=user.id,
            name=account_name,
            type=account_type,
            balance=Decimal(str(belvo_account.get("balance", {}).get("current", 0) or 0)),
            currency=belvo_account.get("currency", "ARS"),
        )
        db.add(account)
        db.commit()
        db.refresh(account)
        logger.info(f"Cuenta '{account_name}' creada para usuario {user.id} (belvo_account_id={belvo_account_id})")

    return account


def get_or_create_belvo_categories(db: Session, user: models.User) -> dict:
    """Obtiene o crea categorías de ingresos y egresos para movimientos de Belvo."""
    categories = {}

    category_defs = [
        {"name": "Belvo Ingresos", "type": models.CategoryType.INCOME, "color": "#2dd4bf", "icon": "trending-up"},
        {"name": "Belvo Gastos", "type": models.CategoryType.EXPENSE, "color": "#f97316", "icon": "credit-card"},
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


def sync_belvo_to_transactions(
    db: Session,
    user: models.User,
    transactions: list,
    accounts_by_belvo_id: dict,
    expense_category_id: str,
    income_category_id: str,
) -> dict:
    """
    Convierte movimientos de Belvo en transacciones locales.
    `type` de Belvo: INFLOW (ingreso) / OUTFLOW (egreso).
    """
    imported = 0
    skipped = 0
    balance_deltas: dict[str, Decimal] = {}

    for tx in transactions:
        belvo_tx_id = str(tx.get("id", ""))
        belvo_account_id = str(tx.get("account", {}).get("id", ""))

        account = accounts_by_belvo_id.get(belvo_account_id)
        if not account:
            skipped += 1
            continue

        if db.query(models.Transaction).filter(
            models.Transaction.external_id == f"belvo_{belvo_tx_id}",
        ).first():
            skipped += 1
            continue

        raw_amount = Decimal(str(tx.get("amount", 0) or 0))
        if raw_amount == 0:
            skipped += 1
            continue

        is_expense = tx.get("type", "").upper() == "OUTFLOW"
        if is_expense:
            amount = -abs(raw_amount)
            category_id = expense_category_id
        else:
            amount = abs(raw_amount)
            category_id = income_category_id

        description = tx.get("description") or f"Movimiento #{belvo_tx_id}"

        value_date = tx.get("value_date") or tx.get("accounting_date", "")
        try:
            tx_date = datetime.fromisoformat(value_date).date()
        except (ValueError, TypeError):
            tx_date = date.today()

        db.add(models.Transaction(
            account_id=account.id,
            category_id=category_id,
            amount=amount,
            description=description,
            transaction_date=tx_date,
            external_id=f"belvo_{belvo_tx_id}",
            source="belvo",
        ))
        balance_deltas[account.id] = balance_deltas.get(account.id, Decimal("0")) + amount
        imported += 1

    if imported > 0:
        for account_id, delta in balance_deltas.items():
            account = db.query(models.Account).filter(models.Account.id == account_id).first()
            if account:
                account.balance = (account.balance or Decimal("0")) + delta
        db.commit()

    return {
        "transactions_imported": imported,
        "transactions_skipped": skipped,
        "message": f"Se importaron {imported} transacciones nuevas ({skipped} ya existían o sin cuenta asociada).",
    }


async def _sync_one_connection(db: Session, connection: models.BelvoConnection) -> None:
    user = db.query(models.User).filter(models.User.id == connection.user_id).first()
    if not user:
        return

    accounts = await fetch_accounts(connection.link_id)
    accounts_by_belvo_id = {
        str(acc.get("id", "")): get_or_create_belvo_account(db, user, acc, connection.institution_name)
        for acc in accounts
    }

    transactions = await fetch_transactions(connection.link_id, connection.last_sync_at)
    categories = get_or_create_belvo_categories(db, user)

    sync_belvo_to_transactions(
        db=db,
        user=user,
        transactions=transactions,
        accounts_by_belvo_id=accounts_by_belvo_id,
        expense_category_id=categories["Belvo Gastos"].id,
        income_category_id=categories["Belvo Ingresos"].id,
    )

    connection.last_sync_at = datetime.now(timezone.utc)
    db.commit()


def sync_all_belvo_connections():
    """
    Job programado (cada 6h vía APScheduler en main.py). Recorre todas las
    conexiones Belvo activas y sincroniza una por una: si una falla, no
    aborta el resto.
    """
    db: Session = SessionLocal()
    try:
        connections = db.query(models.BelvoConnection).all()
        for connection in connections:
            try:
                asyncio.run(_sync_one_connection(db, connection))
            except Exception as e:
                logger.warning(f"Sync programado de Belvo falló para connection_id={connection.id}: {e}")
    finally:
        db.close()
