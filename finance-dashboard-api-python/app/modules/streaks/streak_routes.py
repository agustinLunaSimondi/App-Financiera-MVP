"""Endpoints para streaks (#62)."""
from datetime import date, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.database import models
from app.database.database import get_db

from .logic import next_badge, unlocked_badges
from .processor import evaluate_user_streak

router = APIRouter(prefix="/streaks", tags=["streaks"])


@router.get("/me")
def get_my_streak(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Devuelve el estado actual del streak del usuario, recalculando hasta ayer si quedó atrasado."""
    today = date.today()
    yesterday = today - timedelta(days=1)
    row = db.query(models.UserStreak).filter(models.UserStreak.user_id == current_user.id).first()

    # Si nunca fue evaluado o quedó >1 día atrasado, lo avanzamos hasta ayer (greedy, hasta 7 días).
    target_last = yesterday
    if row is None or row.last_evaluated_on is None:
        # Empezamos evaluando el día anterior y ya está; no pretendemos rellenar historia.
        row = evaluate_user_streak(db, current_user, yesterday)
        db.commit()
    elif row.last_evaluated_on < target_last:
        # Catch-up acotado a 7 días para evitar recorrer años.
        start = max(row.last_evaluated_on + timedelta(days=1), target_last - timedelta(days=7))
        d = start
        while d <= target_last:
            row = evaluate_user_streak(db, current_user, d)
            d += timedelta(days=1)
        db.commit()

    return {
        "currentStreak": row.current_streak,
        "longestStreak": row.longest_streak,
        "lastZeroDayAt": row.last_zero_day_at.isoformat() if row.last_zero_day_at else None,
        "lastEvaluatedOn": row.last_evaluated_on.isoformat() if row.last_evaluated_on else None,
        "badges": unlocked_badges(row.longest_streak),
        "nextBadge": next_badge(row.current_streak),
    }
