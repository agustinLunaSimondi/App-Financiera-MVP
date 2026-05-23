"""Tests del detector de suscripciones recurrentes (#61)."""
from decimal import Decimal
from datetime import date, timedelta

from app.modules.recurring.recurring_suggestions import (
    TxLite,
    detect_subscriptions,
    normalize_description,
)


def _tx(i, desc, amount, day_offset, cat="cat1", acc="acc1", recurring_id=None):
    return TxLite(
        id=f"tx{i}",
        description=desc,
        amount=Decimal(str(amount)),
        transaction_date=date(2026, 5, 1) + timedelta(days=day_offset),
        category_id=cat,
        account_id=acc,
        recurring_id=recurring_id,
    )


def test_normalize_strips_numbers_and_lowercases():
    assert normalize_description("PEDIDOSYA *PEDIDO 12345") == "pedidosya pedido"
    assert normalize_description("Netflix.com  ") == "netflix com"
    assert normalize_description("") == ""


def test_detects_monthly_subscription():
    txs = [
        _tx(1, "Netflix", -4500, 0),
        _tx(2, "Netflix", -4500, 30),
        _tx(3, "Netflix", -4500, 60),
    ]
    out = detect_subscriptions(txs)
    assert len(out) == 1
    s = out[0]
    assert s.occurrences == 3
    assert s.average_amount == Decimal("-4500.00")
    assert s.category_id == "cat1"
    assert s.account_id == "acc1"


def test_skips_when_fewer_than_three_occurrences():
    txs = [_tx(1, "Spotify", -2500, 0), _tx(2, "Spotify", -2500, 30)]
    assert detect_subscriptions(txs) == []


def test_skips_when_intervals_too_irregular():
    # intervalos [3, 80] → mediana 41.5, fuera de 30 ±5
    txs = [
        _tx(1, "Random", -1000, 0),
        _tx(2, "Random", -1000, 3),
        _tx(3, "Random", -1000, 83),
    ]
    assert detect_subscriptions(txs) == []


def test_skips_when_amounts_too_different():
    txs = [
        _tx(1, "Supermercado", -1000, 0),
        _tx(2, "Supermercado", -3000, 30),  # 200% del promedio
        _tx(3, "Supermercado", -1500, 60),
    ]
    assert detect_subscriptions(txs) == []


def test_ignores_already_linked_to_recurring():
    txs = [
        _tx(1, "Netflix", -4500, 0, recurring_id="rt1"),
        _tx(2, "Netflix", -4500, 30, recurring_id="rt1"),
        _tx(3, "Netflix", -4500, 60, recurring_id="rt1"),
    ]
    assert detect_subscriptions(txs) == []


def test_ignores_income_transactions():
    txs = [
        _tx(1, "Sueldo", 100000, 0),
        _tx(2, "Sueldo", 100000, 30),
        _tx(3, "Sueldo", 100000, 60),
    ]
    assert detect_subscriptions(txs) == []


def test_groups_by_normalized_description():
    # Distintos sufijos numéricos pero misma key normalizada.
    txs = [
        _tx(1, "OPENAI *SUB 123", -3500, 0),
        _tx(2, "OPENAI *SUB 456", -3500, 31),
        _tx(3, "OPENAI *SUB 789", -3500, 59),
    ]
    out = detect_subscriptions(txs)
    assert len(out) == 1
    assert "openai" in out[0].key


def test_accepts_amounts_within_ten_percent():
    # 1000, 1050, 950 → promedio 1000, todos dentro de ±10%.
    txs = [
        _tx(1, "Spotify", -1000, 0),
        _tx(2, "Spotify", -1050, 30),
        _tx(3, "Spotify", -950, 60),
    ]
    out = detect_subscriptions(txs)
    assert len(out) == 1
    assert out[0].occurrences == 3
