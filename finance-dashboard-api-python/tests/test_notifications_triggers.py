"""Tests de los detectores puros de Aki proactivo (#51)."""
from decimal import Decimal
from datetime import date

from app.modules.notifications.triggers import (
    detect_budget_at_risk,
    detect_goal_at_risk,
    detect_unusual_spend,
)


TODAY = date(2026, 5, 15)


def test_budget_at_risk_triggers_when_over_70_pct_before_60_pct_of_month():
    # día 12 de 31 → 38% del mes; 80% gastado → debe disparar.
    cand = detect_budget_at_risk(Decimal("10000"), Decimal("8000"), 12, 31, "Comida", TODAY)
    assert cand is not None
    assert cand.type == "budget_at_risk"


def test_budget_at_risk_not_triggered_when_period_advanced():
    # día 25 de 31 → 80% del mes → no disparar aunque gastó 80%.
    cand = detect_budget_at_risk(Decimal("10000"), Decimal("8000"), 25, 31, "Comida", TODAY)
    assert cand is None


def test_budget_at_risk_not_triggered_below_threshold():
    cand = detect_budget_at_risk(Decimal("10000"), Decimal("5000"), 10, 31, "Comida", TODAY)
    assert cand is None


def test_unusual_spend_triggers_at_2x():
    cand = detect_unusual_spend(Decimal("-20000"), Decimal("8000"), "Delivery", TODAY, "tx1")
    assert cand is not None
    assert "Delivery" in cand.headline


def test_unusual_spend_skips_below_2x():
    cand = detect_unusual_spend(Decimal("-12000"), Decimal("8000"), "Delivery", TODAY, "tx1")
    assert cand is None


def test_goal_at_risk_close_deadline_low_progress():
    cand = detect_goal_at_risk("Auto", progress_pct=30.0, days_to_deadline=15, today=TODAY, goal_id="g1")
    assert cand is not None


def test_goal_at_risk_skipped_when_deadline_far():
    cand = detect_goal_at_risk("Auto", progress_pct=30.0, days_to_deadline=120, today=TODAY, goal_id="g1")
    assert cand is None


def test_goal_at_risk_skipped_when_on_track():
    cand = detect_goal_at_risk("Auto", progress_pct=85.0, days_to_deadline=15, today=TODAY, goal_id="g1")
    assert cand is None
