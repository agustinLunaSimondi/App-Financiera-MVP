"""
Procesadores de notificaciones (#51 + #52).

- `run_weekly_snapshots(today)`: corre los domingos. Genera y envía el resumen
  semanal a cada user con `email_weekly_snapshot=True`.
- `run_daily_smart_alerts(today)`: corre 9am cada día. Recorre triggers y emite
  un mail por candidate, dedup por tabla `notifications`.

Idempotencia: ambos consultan `notifications.dedup_key` antes de mandar.
"""
from __future__ import annotations

import logging
from datetime import date, timedelta
from decimal import Decimal
from statistics import mean
from typing import List

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.email import send_email
from app.core.email_templates import render_weekly_snapshot, render_smart_alert
from app.database import models
from app.database.database import SessionLocal
from .triggers import (
    TriggerCandidate,
    detect_budget_at_risk,
    detect_goal_at_risk,
    detect_unusual_spend,
)

logger = logging.getLogger(__name__)

WEEKLY_LOCK_KEY = 859203742
DAILY_LOCK_KEY = 859203743


def _try_lock(db: Session, key: int) -> bool:
    try:
        return bool(db.execute(text("SELECT pg_try_advisory_lock(:k)"), {"k": key}).scalar())
    except Exception:
        return True  # SQLite/test


def _release_lock(db: Session, key: int) -> None:
    try:
        db.execute(text("SELECT pg_advisory_unlock(:k)"), {"k": key})
    except Exception:
        pass


def _already_sent(db: Session, user_id: str, dedup_key: str) -> bool:
    return (
        db.query(models.Notification)
        .filter(models.Notification.user_id == user_id, models.Notification.dedup_key == dedup_key)
        .first()
        is not None
    )


def _mark_sent(db: Session, user_id: str, type_: str, dedup_key: str) -> None:
    db.add(models.Notification(user_id=user_id, type=type_, dedup_key=dedup_key))
    db.flush()


# ── Snapshot semanal (#52) ─────────────────────────────────────
def _build_weekly_snapshot(db: Session, user: models.User, today: date) -> dict:
    week_start = today - timedelta(days=7)
    last_week_start = week_start - timedelta(days=7)

    week_txs = (
        db.query(models.Transaction)
        .join(models.Account)
        .filter(
            models.Account.user_id == user.id,
            models.Transaction.transaction_date >= week_start,
            models.Transaction.transaction_date < today,
            models.Transaction.amount < 0,
        )
        .all()
    )
    last_week_txs = (
        db.query(models.Transaction)
        .join(models.Account)
        .filter(
            models.Account.user_id == user.id,
            models.Transaction.transaction_date >= last_week_start,
            models.Transaction.transaction_date < week_start,
            models.Transaction.amount < 0,
        )
        .all()
    )

    by_cat: dict[str, Decimal] = {}
    for t in week_txs:
        name = t.category.name if t.category else "Sin categoría"
        by_cat[name] = by_cat.get(name, Decimal("0")) + abs(Decimal(str(t.amount)))
    top_expenses = sorted(
        ({"category": k, "total": v} for k, v in by_cat.items()),
        key=lambda x: x["total"], reverse=True,
    )[:3]

    week_total = sum((abs(Decimal(str(t.amount))) for t in week_txs), Decimal("0"))
    last_week_total = sum((abs(Decimal(str(t.amount))) for t in last_week_txs), Decimal("0"))
    delta_pct = None
    if last_week_total > 0:
        delta_pct = float((week_total - last_week_total) / last_week_total * 100)

    return {
        "week_label": f"Semana del {week_start.strftime('%d %b')} al {(today - timedelta(days=1)).strftime('%d %b')}",
        "top_expenses": top_expenses,
        "week_delta_pct": delta_pct,
        "goals_progress": [],  # MVP: vacío; se llenará cuando trackeemos depósitos por semana
        "insight": None,
    }


def run_weekly_snapshots(today: date | None = None) -> int:
    today = today or date.today()
    db = SessionLocal()
    sent = 0
    if not _try_lock(db, WEEKLY_LOCK_KEY):
        db.close()
        return 0
    try:
        users = db.query(models.User).filter(models.User.email_weekly_snapshot == True).all()  # noqa: E712
        for user in users:
            dedup = f"weekly_snapshot:{today.isocalendar().year}-W{today.isocalendar().week:02d}"
            if _already_sent(db, user.id, dedup):
                continue
            data = _build_weekly_snapshot(db, user, today)
            html = render_weekly_snapshot(user.name or "vos", data)
            ok = send_email(user.email, "Tu semana en Vuelto", html)
            if ok:
                _mark_sent(db, user.id, "weekly_snapshot", dedup)
                sent += 1
        db.commit()
    except Exception:
        logger.exception("weekly_snapshots failed")
        db.rollback()
    finally:
        _release_lock(db, WEEKLY_LOCK_KEY)
        db.close()
    logger.info("weekly_snapshots: %s emails enviados", sent)
    return sent


# ── Alertas diarias (#51) ──────────────────────────────────────
def _collect_alerts_for_user(db: Session, user: models.User, today: date) -> List[TriggerCandidate]:
    candidates: List[TriggerCandidate] = []

    # 1) budgets en riesgo (uno por budget mensual)
    budgets = db.query(models.Budget).filter(models.Budget.user_id == user.id).all()
    day = today.day
    last_day = (date(today.year, today.month % 12 + 1, 1) - timedelta(days=1)).day if today.month != 12 else 31
    month_start = date(today.year, today.month, 1)
    for b in budgets:
        spent = sum(
            (abs(Decimal(str(t.amount))) for t in
             db.query(models.Transaction).join(models.Account).filter(
                 models.Account.user_id == user.id,
                 models.Transaction.category_id == b.category_id,
                 models.Transaction.amount < 0,
                 models.Transaction.transaction_date >= month_start,
                 models.Transaction.transaction_date <= today,
             ).all()),
            Decimal("0"),
        )
        cat_name = b.category.name if b.category else "Sin categoría"
        cand = detect_budget_at_risk(Decimal(str(b.amount)), spent, day, last_day, cat_name, today)
        if cand:
            candidates.append(cand)

    # 2) unusual spend: revisamos solo las tx de ayer (alta cardinalidad si miramos todas)
    yesterday = today - timedelta(days=1)
    new_txs = db.query(models.Transaction).join(models.Account).filter(
        models.Account.user_id == user.id,
        models.Transaction.amount < 0,
        models.Transaction.transaction_date == yesterday,
    ).all()
    if new_txs:
        cutoff = today - timedelta(days=90)
        for t in new_txs:
            hist = db.query(models.Transaction).join(models.Account).filter(
                models.Account.user_id == user.id,
                models.Transaction.category_id == t.category_id,
                models.Transaction.amount < 0,
                models.Transaction.transaction_date >= cutoff,
                models.Transaction.transaction_date < yesterday,
            ).all()
            if not hist:
                continue
            avg = mean(abs(Decimal(str(h.amount))) for h in hist)
            cat_name = t.category.name if t.category else "categoría"
            cand = detect_unusual_spend(Decimal(str(t.amount)), Decimal(str(avg)), cat_name, today, t.id)
            if cand:
                candidates.append(cand)

    # 3) goals en riesgo
    goals = db.query(models.SavingGoal).filter(models.SavingGoal.user_id == user.id).all()
    for g in goals:
        if not g.deadline:
            continue
        days_left = (g.deadline - today).days
        progress = float(g.current_amount / g.target_amount * 100) if g.target_amount else 0
        cand = detect_goal_at_risk(g.name, progress, days_left, today, g.id)
        if cand:
            candidates.append(cand)

    return candidates


def run_daily_smart_alerts(today: date | None = None) -> int:
    today = today or date.today()
    db = SessionLocal()
    sent = 0
    if not _try_lock(db, DAILY_LOCK_KEY):
        db.close()
        return 0
    try:
        users = db.query(models.User).filter(models.User.email_smart_alerts == True).all()  # noqa: E712
        for user in users:
            for cand in _collect_alerts_for_user(db, user, today):
                if _already_sent(db, user.id, cand.dedup_key):
                    continue
                html = render_smart_alert(user.name or "vos", cand.headline, cand.body_html)
                ok = send_email(user.email, cand.headline, html)
                if ok:
                    _mark_sent(db, user.id, cand.type, cand.dedup_key)
                    sent += 1
        db.commit()
    except Exception:
        logger.exception("daily_smart_alerts failed")
        db.rollback()
    finally:
        _release_lock(db, DAILY_LOCK_KEY)
        db.close()
    logger.info("daily_smart_alerts: %s emails enviados", sent)
    return sent
