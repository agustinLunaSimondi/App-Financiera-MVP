"""
Pruebas de la integración con Belvo: mapeo signo INFLOW/OUTFLOW, dedup por
external_id, fallback de fecha y validación de config.
"""
from datetime import date
from decimal import Decimal

import pytest

from app.modules.belvo import belvo_service


# --- get_belvo_config -------------------------------------------------------

def test_get_belvo_config_raises_without_secret_id(monkeypatch):
    monkeypatch.delenv("BELVO_SECRET_ID", raising=False)
    monkeypatch.delenv("BELVO_SECRET_PASSWORD", raising=False)
    with pytest.raises(ValueError):
        belvo_service.get_belvo_config()


def test_get_belvo_config_uses_sandbox_url_by_default(monkeypatch):
    monkeypatch.setenv("BELVO_SECRET_ID", "id")
    monkeypatch.setenv("BELVO_SECRET_PASSWORD", "pw")
    monkeypatch.delenv("BELVO_ENV", raising=False)
    config = belvo_service.get_belvo_config()
    assert config["base_url"] == "https://sandbox.belvo.com"


def test_get_belvo_config_uses_production_url_when_set(monkeypatch):
    monkeypatch.setenv("BELVO_SECRET_ID", "id")
    monkeypatch.setenv("BELVO_SECRET_PASSWORD", "pw")
    monkeypatch.setenv("BELVO_ENV", "production")
    config = belvo_service.get_belvo_config()
    assert config["base_url"] == "https://api.belvo.com"


# --- sync_belvo_to_transactions (mapeo puro, sin DB real) -------------------

class _FakeAccount:
    def __init__(self, id_):
        self.id = id_


class _FakeQuery:
    """Simula db.query(...).filter(...).first() devolviendo siempre None (sin dedup previo)."""
    def filter(self, *args, **kwargs):
        return self

    def first(self):
        return None


class _FakeDB:
    """Doble de Session: solo soporta lo que sync_belvo_to_transactions necesita."""
    def __init__(self):
        self.added = []
        self.committed = False

    def query(self, *args, **kwargs):
        return _FakeQuery()

    def add(self, obj):
        self.added.append(obj)

    def commit(self):
        self.committed = True


def test_sync_maps_inflow_as_positive_income():
    db = _FakeDB()
    account = _FakeAccount("acc-1")
    tx = {
        "id": "tx-1",
        "type": "INFLOW",
        "amount": 500,
        "account": {"id": "belvo-acc-1"},
        "value_date": "2026-06-01",
        "description": "Transferencia recibida",
    }

    result = belvo_service.sync_belvo_to_transactions(
        db=db,
        user=None,
        transactions=[tx],
        accounts_by_belvo_id={"belvo-acc-1": account},
        expense_category_id="exp-cat",
        income_category_id="inc-cat",
    )

    assert result["transactions_imported"] == 1
    assert db.added[0].amount == Decimal("500")
    assert db.added[0].category_id == "inc-cat"
    assert db.added[0].external_id == "belvo_tx-1"
    assert db.added[0].source == "belvo"


def test_sync_maps_outflow_as_negative_expense():
    db = _FakeDB()
    account = _FakeAccount("acc-1")
    tx = {
        "id": "tx-2",
        "type": "OUTFLOW",
        "amount": 300,
        "account": {"id": "belvo-acc-1"},
        "value_date": "2026-06-02",
    }

    result = belvo_service.sync_belvo_to_transactions(
        db=db,
        user=None,
        transactions=[tx],
        accounts_by_belvo_id={"belvo-acc-1": account},
        expense_category_id="exp-cat",
        income_category_id="inc-cat",
    )

    assert result["transactions_imported"] == 1
    assert db.added[0].amount == Decimal("-300")
    assert db.added[0].category_id == "exp-cat"


def test_sync_skips_transaction_without_matching_account():
    db = _FakeDB()
    tx = {"id": "tx-3", "type": "INFLOW", "amount": 100, "account": {"id": "unknown-acc"}}

    result = belvo_service.sync_belvo_to_transactions(
        db=db,
        user=None,
        transactions=[tx],
        accounts_by_belvo_id={},
        expense_category_id="exp-cat",
        income_category_id="inc-cat",
    )

    assert result["transactions_imported"] == 0
    assert result["transactions_skipped"] == 1
    assert db.added == []


def test_sync_skips_zero_amount_transaction():
    db = _FakeDB()
    account = _FakeAccount("acc-1")
    tx = {"id": "tx-4", "type": "INFLOW", "amount": 0, "account": {"id": "belvo-acc-1"}}

    result = belvo_service.sync_belvo_to_transactions(
        db=db,
        user=None,
        transactions=[tx],
        accounts_by_belvo_id={"belvo-acc-1": account},
        expense_category_id="exp-cat",
        income_category_id="inc-cat",
    )

    assert result["transactions_imported"] == 0
    assert result["transactions_skipped"] == 1


def test_sync_falls_back_to_today_when_date_missing():
    db = _FakeDB()
    account = _FakeAccount("acc-1")
    tx = {"id": "tx-5", "type": "INFLOW", "amount": 50, "account": {"id": "belvo-acc-1"}}

    belvo_service.sync_belvo_to_transactions(
        db=db,
        user=None,
        transactions=[tx],
        accounts_by_belvo_id={"belvo-acc-1": account},
        expense_category_id="exp-cat",
        income_category_id="inc-cat",
    )

    assert db.added[0].transaction_date == date.today()
