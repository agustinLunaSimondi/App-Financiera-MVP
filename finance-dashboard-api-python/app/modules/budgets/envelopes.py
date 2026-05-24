"""
Lógica de validación del modo envelopes (#60).

En modo `envelopes`, cada categoría con budget mensual es un sobre con un cap
mensual. Si el usuario intenta cargar un gasto que excede el budget de la
categoría dentro del mes actual, el endpoint debe rechazar con 409.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from decimal import Decimal
from typing import Optional

from sqlalchemy.orm import Session

from app.database import models


@dataclass
class EnvelopeStatus:
    """Estado del sobre para una categoría en el mes actual."""
    budget: Decimal           # tope mensual (siempre positivo)
    spent: Decimal            # gastado en el mes (positivo)
    remaining: Decimal        # budget - spent (puede ser 0 o positivo)


def _month_window(today: date) -> tuple[date, date]:
    start = date(today.year, today.month, 1)
    if today.month == 12:
        next_start = date(today.year + 1, 1, 1)
    else:
        next_start = date(today.year, today.month + 1, 1)
    return start, next_start


def envelope_status_for_category(
    db: Session, user_id: str, category_id: str, today: Optional[date] = None,
) -> Optional[EnvelopeStatus]:
    """Devuelve el estado del sobre o None si la categoría no tiene budget mensual."""
    today = today or date.today()
    budget = (
        db.query(models.Budget)
        .filter(
            models.Budget.user_id == user_id,
            models.Budget.category_id == category_id,
            models.Budget.period == models.BudgetPeriod.MONTHLY,
        )
        .first()
    )
    if not budget:
        return None

    month_start, next_month_start = _month_window(today)
    spent = (
        db.query(models.Transaction)
        .join(models.Account)
        .filter(
            models.Account.user_id == user_id,
            models.Transaction.category_id == category_id,
            models.Transaction.amount < 0,
            models.Transaction.transaction_date >= month_start,
            models.Transaction.transaction_date < next_month_start,
        )
        .all()
    )
    total_spent = sum(
        (abs(Decimal(str(t.amount))) for t in spent), Decimal("0")
    )
    budget_amount = Decimal(str(budget.amount))
    remaining = max(Decimal("0"), budget_amount - total_spent)
    return EnvelopeStatus(budget=budget_amount, spent=total_spent, remaining=remaining)


def can_charge_to_envelope(
    db: Session, user: models.User, category_id: str, amount: Decimal, tx_date: date,
) -> tuple[bool, Optional[EnvelopeStatus], Optional[str]]:
    """
    Retorna (ok, status, reason).
    - Solo aplica si user.budget_mode == 'envelopes'.
    - Solo aplica a gastos (amount < 0) dentro del mes corriente.
    - Si la categoría no tiene budget mensual, deja pasar (no es un sobre).
    """
    if user.budget_mode != "envelopes":
        return True, None, None
    if amount >= 0:
        return True, None, None

    today = date.today()
    month_start, next_month_start = _month_window(today)
    if not (month_start <= tx_date < next_month_start):
        return True, None, None

    status = envelope_status_for_category(db, user.id, category_id, today=today)
    if status is None:
        return True, None, None

    requested = abs(amount)
    if requested > status.remaining:
        return False, status, (
            f"Sobre lleno: te quedan ${status.remaining:.2f} de ${status.budget:.2f} en este mes."
        )
    return True, status, None
