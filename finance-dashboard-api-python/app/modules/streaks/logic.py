"""
Lógica pura para streaks (#62). Sin DB, fácil de testear.

Definición de "día sin gasto no esencial":
- El día NO tiene transacciones manuales con amount < 0
  (las tx con `recurring_id` son automáticas — sueldo, suscripciones, etc. y
  no rompen la racha porque no fueron decisiones del usuario en el día).
- Solo se cuentan ingresos en el día, no rompen la racha.

Reglas de transición:
- Si el día evaluado fue zero-day → current_streak += 1.
- Si el día evaluado NO fue zero-day → current_streak = 0.
- longest_streak = max(longest_streak, current_streak).
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta
from decimal import Decimal
from typing import Iterable, Optional


@dataclass(frozen=True)
class TxLite:
    """Mini-representación de una transacción para evaluar streaks. Decoupled del ORM."""
    transaction_date: date
    amount: Decimal
    is_recurring: bool


def is_zero_day(day: date, txs: Iterable[TxLite]) -> bool:
    """¿Este día fue 'sin gasto no esencial'?"""
    for tx in txs:
        if tx.transaction_date != day:
            continue
        if tx.amount >= 0:
            continue  # ingreso, no rompe
        if tx.is_recurring:
            continue  # gasto automático, no rompe
        return False
    return True


@dataclass
class StreakState:
    current: int
    longest: int
    last_zero_day_at: Optional[date]
    last_evaluated_on: Optional[date]


def evaluate_day(state: StreakState, day: date, txs: Iterable[TxLite]) -> StreakState:
    """Avanza el estado del streak al evaluar un día. Idempotente si el día ya fue evaluado."""
    if state.last_evaluated_on == day:
        return state
    zero = is_zero_day(day, txs)
    new_current = state.current + 1 if zero else 0
    new_longest = max(state.longest, new_current)
    new_last_zero = day if zero else state.last_zero_day_at
    return StreakState(
        current=new_current,
        longest=new_longest,
        last_zero_day_at=new_last_zero,
        last_evaluated_on=day,
    )


# Badges desbloqueables (#62)
BADGES = [
    {"key": "seed", "label": "🌱 Brote", "threshold": 7},
    {"key": "tree", "label": "🌳 Árbol", "threshold": 30},
    {"key": "trophy", "label": "🏆 Maestro", "threshold": 90},
]


def unlocked_badges(longest: int) -> list[dict]:
    return [b for b in BADGES if longest >= b["threshold"]]


def next_badge(current: int) -> Optional[dict]:
    for b in BADGES:
        if current < b["threshold"]:
            return {**b, "days_to_unlock": b["threshold"] - current}
    return None
