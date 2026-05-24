"""Tests para streaks (#62)."""
from datetime import date, timedelta
from decimal import Decimal

from app.database import models
from app.modules.streaks.logic import (
    BADGES, StreakState, TxLite, evaluate_day, is_zero_day, next_badge, unlocked_badges,
)
from app.modules.streaks.processor import evaluate_user_streak


D = date(2026, 5, 22)


def _empty_state():
    return StreakState(current=0, longest=0, last_zero_day_at=None, last_evaluated_on=None)


def test_zero_day_with_no_tx():
    assert is_zero_day(D, []) is True


def test_zero_day_ignores_income():
    txs = [TxLite(D, Decimal("100000"), is_recurring=False)]
    assert is_zero_day(D, txs) is True


def test_zero_day_ignores_recurring_expense():
    """Una suscripción automática NO rompe la racha — no fue decisión del día."""
    txs = [TxLite(D, Decimal("-500"), is_recurring=True)]
    assert is_zero_day(D, txs) is True


def test_non_zero_day_breaks_streak():
    state = StreakState(current=5, longest=10, last_zero_day_at=D - timedelta(days=1), last_evaluated_on=D - timedelta(days=1))
    txs = [TxLite(D, Decimal("-200"), is_recurring=False)]
    new = evaluate_day(state, D, txs)
    assert new.current == 0
    assert new.longest == 10
    assert new.last_evaluated_on == D


def test_zero_day_increments_streak():
    state = _empty_state()
    new = evaluate_day(state, D, [])
    assert new.current == 1
    assert new.longest == 1
    assert new.last_zero_day_at == D


def test_evaluate_day_is_idempotent_for_same_day():
    state = StreakState(current=3, longest=5, last_zero_day_at=D, last_evaluated_on=D)
    new = evaluate_day(state, D, [TxLite(D, Decimal("-100"), is_recurring=False)])
    assert new == state  # no re-evalúa


def test_badges_unlocked_at_thresholds():
    assert unlocked_badges(0) == []
    assert unlocked_badges(6) == []
    assert len(unlocked_badges(7)) == 1
    assert len(unlocked_badges(30)) == 2
    assert len(unlocked_badges(90)) == 3


def test_next_badge_progression():
    nb = next_badge(0)
    assert nb["threshold"] == 7
    assert nb["days_to_unlock"] == 7

    nb = next_badge(29)
    assert nb["threshold"] == 30
    assert nb["days_to_unlock"] == 1

    assert next_badge(100) is None


def test_processor_persists_state(db_session, user):
    acc = models.Account(name="Banco", type=models.AccountType.CHECKING, balance=Decimal("0"), currency="ARS", user_id=user.id)
    cat = models.Category(name="Comida", type=models.CategoryType.EXPENSE, user_id=user.id, is_default=False)
    db_session.add_all([acc, cat]); db_session.commit()

    # Día sin tx → streak debe pasar a 1
    row = evaluate_user_streak(db_session, user, D)
    db_session.commit()
    assert row.current_streak == 1
    assert row.longest_streak == 1

    # Día siguiente con gasto manual → streak vuelve a 0 pero longest se queda en 1
    tx = models.Transaction(
        account_id=acc.id, category_id=cat.id,
        amount=Decimal("-1000"), description="Cafe",
        transaction_date=D + timedelta(days=1),
    )
    db_session.add(tx); db_session.commit()
    row = evaluate_user_streak(db_session, user, D + timedelta(days=1))
    db_session.commit()
    assert row.current_streak == 0
    assert row.longest_streak == 1


def test_endpoint_returns_state(client, db_session, user):
    """El endpoint /streaks/me crea la fila si no existe."""
    resp = client.get("/api/streaks/me")
    assert resp.status_code == 200
    data = resp.json()
    assert "currentStreak" in data
    assert "longestStreak" in data
    assert "badges" in data
    assert isinstance(data["badges"], list)
