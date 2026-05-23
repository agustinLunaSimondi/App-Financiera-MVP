"""
Service layer para transacciones.

Extrae la lógica de negocio del router HTTP — testeable sin TestClient,
reusable desde el procesador de recurrentes o el chat agent en el futuro.

Convención: estos métodos NO commitean. El caller decide el commit (router HTTP,
worker, etc.). Esto permite componer múltiples operaciones en una sola transacción.
"""
from decimal import Decimal
from typing import Optional
from sqlalchemy.orm import Session

from app.database import models


def lock_account(db: Session, account_id: str, user_id: str) -> Optional[models.Account]:
    """SELECT ... FOR UPDATE sobre la cuenta del usuario."""
    return db.query(models.Account).filter(
        models.Account.id == account_id,
        models.Account.user_id == user_id,
    ).with_for_update().first()


def apply_amount_to_account(account: models.Account, delta: Decimal) -> None:
    """Suma `delta` (puede ser negativo) al balance. No commitea."""
    account.balance = (account.balance or Decimal("0")) + Decimal(str(delta))


def reverse_transaction_effect(db: Session, tx: models.Transaction, user_id: str) -> None:
    """Resta el monto de la transacción del balance de la cuenta correspondiente."""
    account = lock_account(db, tx.account_id, user_id)
    if account is None:
        return
    apply_amount_to_account(account, -Decimal(str(tx.amount)))


def recalculate_account_balance(db: Session, account: models.Account) -> Decimal:
    """Recalcula `account.balance` = SUM(transactions.amount). Devuelve el nuevo valor."""
    from sqlalchemy import func
    total = db.query(func.coalesce(func.sum(models.Transaction.amount), 0)).filter(
        models.Transaction.account_id == account.id
    ).scalar()
    account.balance = Decimal(str(total or 0))
    return account.balance
