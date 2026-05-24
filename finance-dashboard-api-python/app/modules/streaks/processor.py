"""
Job nocturno (#62): recorre todos los usuarios y avanza su streak evaluando el día de ayer.

Idempotente: si el día ya fue evaluado, no cambia nada.
"""
from __future__ import annotations

import logging
from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import models
from app.database.database import SessionLocal
from .logic import StreakState, TxLite, evaluate_day

logger = logging.getLogger(__name__)

STREAKS_LOCK_KEY = 859203744


def _try_lock(db: Session, key: int) -> bool:
    try:
        return bool(db.execute(text("SELECT pg_try_advisory_lock(:k)"), {"k": key}).scalar())
    except Exception:
        return True


def _release_lock(db: Session, key: int) -> None:
    try:
        db.execute(text("SELECT pg_advisory_unlock(:k)"), {"k": key})
    except Exception:
        pass


def evaluate_user_streak(db: Session, user: models.User, day: date) -> models.UserStreak:
    """Avanza el streak del user al evaluar `day` (usualmente ayer). Crea la fila si no existe."""
    row = db.query(models.UserStreak).filter(models.UserStreak.user_id == user.id).first()
    if row is None:
        row = models.UserStreak(user_id=user.id)
        db.add(row)

    state = StreakState(
        current=row.current_streak or 0,
        longest=row.longest_streak or 0,
        last_zero_day_at=row.last_zero_day_at,
        last_evaluated_on=row.last_evaluated_on,
    )

    # Cargar tx del día (con joined load de recurring para saber si es automática)
    txs_q = (
        db.query(models.Transaction)
        .join(models.Account)
        .filter(
            models.Account.user_id == user.id,
            models.Transaction.transaction_date == day,
        )
        .all()
    )
    txs = [
        TxLite(
            transaction_date=t.transaction_date,
            amount=Decimal(str(t.amount)),
            is_recurring=t.recurring_id is not None,
        )
        for t in txs_q
    ]

    new_state = evaluate_day(state, day, txs)
    row.current_streak = new_state.current
    row.longest_streak = new_state.longest
    row.last_zero_day_at = new_state.last_zero_day_at
    row.last_evaluated_on = new_state.last_evaluated_on
    return row


def run_nightly_streaks(today: date | None = None) -> int:
    """Job nocturno que avanza el streak de cada user evaluando el día de ayer."""
    today = today or date.today()
    yesterday = today - timedelta(days=1)
    db = SessionLocal()
    processed = 0
    if not _try_lock(db, STREAKS_LOCK_KEY):
        db.close()
        return 0
    try:
        users = db.query(models.User).all()
        for u in users:
            evaluate_user_streak(db, u, yesterday)
            processed += 1
        db.commit()
    except Exception:
        logger.exception("nightly_streaks failed")
        db.rollback()
    finally:
        _release_lock(db, STREAKS_LOCK_KEY)
        db.close()
    logger.info("nightly_streaks: %s users procesados", processed)
    return processed
