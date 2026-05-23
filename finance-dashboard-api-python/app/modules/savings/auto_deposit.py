"""
Auto-depósito en metas (#56).

Cuando entra una transacción que matchea la `trigger_category_id` de una GoalRule
activa, transferimos % o monto fijo a la meta. La lógica es pura SQL/ORM — no
HTTP — para poder testearla sola.
"""
from __future__ import annotations

import logging
from decimal import Decimal
from typing import List

from sqlalchemy.orm import Session

from app.database import models

logger = logging.getLogger(__name__)


def apply_auto_deposit_rules(db: Session, tx: models.Transaction) -> List[models.SavingGoal]:
    """
    Buscar reglas activas que matcheen la categoría de `tx`. Para cada una:
    - calcular el depósito (% del monto absoluto, o el fixed_amount).
    - sumarlo a `goal.current_amount`.

    Solo se dispara para tx de ingreso (amount > 0). Devuelve la lista de metas
    afectadas para que el caller pueda hacer refresh/posthog/etc.
    """
    if Decimal(str(tx.amount)) <= 0:
        return []

    rules = db.query(models.GoalRule).filter(
        models.GoalRule.user_id == tx.account.user_id if tx.account else None,
        models.GoalRule.trigger_category_id == tx.category_id,
        models.GoalRule.is_active == True,  # noqa: E712
    ).all()

    if not rules:
        return []

    base = Decimal(str(tx.amount))
    affected: List[models.SavingGoal] = []
    for rule in rules:
        if rule.percentage is not None and rule.percentage > 0:
            deposit = (base * Decimal(str(rule.percentage)) / Decimal("100"))
        elif rule.fixed_amount is not None and rule.fixed_amount > 0:
            deposit = Decimal(str(rule.fixed_amount))
        else:
            continue
        deposit = deposit.quantize(Decimal("0.01"))
        if deposit <= 0:
            continue

        goal = db.query(models.SavingGoal).filter(models.SavingGoal.id == rule.goal_id).with_for_update().first()
        if not goal:
            continue
        goal.current_amount = (goal.current_amount or Decimal("0")) + deposit
        affected.append(goal)
        logger.info(
            "auto_deposit: goal=%s rule=%s deposit=%s",
            goal.id, rule.id, deposit
        )
    return affected
