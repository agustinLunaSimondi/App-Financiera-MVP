"""Tests para envelopes mode (#60)."""
from datetime import date
from decimal import Decimal

from app.database import models
from app.modules.budgets.envelopes import can_charge_to_envelope, envelope_status_for_category


def _setup_envelope(db_session, user, budget_amount: Decimal):
    acc = models.Account(name="Banco", type=models.AccountType.CHECKING, balance=Decimal("0"), currency="ARS", user_id=user.id)
    cat = models.Category(name="Salidas", type=models.CategoryType.EXPENSE, user_id=user.id, is_default=False)
    db_session.add_all([acc, cat]); db_session.commit()
    b = models.Budget(user_id=user.id, category_id=cat.id, amount=budget_amount, period=models.BudgetPeriod.MONTHLY, start_date=date.today().replace(day=1))
    db_session.add(b); db_session.commit()
    return acc, cat, b


def test_status_returns_none_when_no_budget(db_session, user):
    acc = models.Account(name="x", type=models.AccountType.CHECKING, balance=Decimal("0"), currency="ARS", user_id=user.id)
    cat = models.Category(name="x", type=models.CategoryType.EXPENSE, user_id=user.id)
    db_session.add_all([acc, cat]); db_session.commit()
    assert envelope_status_for_category(db_session, user.id, cat.id) is None


def test_status_reflects_spend(db_session, user):
    acc, cat, _ = _setup_envelope(db_session, user, Decimal("30000"))
    tx = models.Transaction(
        account_id=acc.id, category_id=cat.id,
        amount=Decimal("-12000"), description="Bar",
        transaction_date=date.today(),
    )
    db_session.add(tx); db_session.commit()
    status = envelope_status_for_category(db_session, user.id, cat.id)
    assert status.budget == Decimal("30000")
    assert status.spent == Decimal("12000")
    assert status.remaining == Decimal("18000")


def test_can_charge_passes_in_standard_mode(db_session, user):
    acc, cat, _ = _setup_envelope(db_session, user, Decimal("1000"))
    user.budget_mode = "standard"
    db_session.commit()
    ok, _, _ = can_charge_to_envelope(db_session, user, cat.id, Decimal("-99999"), date.today())
    assert ok is True


def test_can_charge_blocks_when_envelope_empty(db_session, user):
    acc, cat, b = _setup_envelope(db_session, user, Decimal("5000"))
    b.is_strict = True  # modo chanchito per-budget (reemplazó al budget_mode global, #65f000e)
    db_session.add(models.Transaction(
        account_id=acc.id, category_id=cat.id,
        amount=Decimal("-4500"), description="Comida",
        transaction_date=date.today(),
    ))
    db_session.commit()

    ok, status, reason = can_charge_to_envelope(db_session, user, cat.id, Decimal("-1000"), date.today())
    assert ok is False
    assert status.remaining == Decimal("500")
    assert "chanchito" in reason  # wording actual del modo chanchito (#65f000e)


def test_can_charge_passes_when_within_envelope(db_session, user):
    acc, cat, _ = _setup_envelope(db_session, user, Decimal("5000"))
    user.budget_mode = "envelopes"
    db_session.commit()
    ok, status, reason = can_charge_to_envelope(db_session, user, cat.id, Decimal("-3000"), date.today())
    assert ok is True
    assert reason is None


def test_can_charge_ignores_income(db_session, user):
    acc, cat, _ = _setup_envelope(db_session, user, Decimal("1000"))
    user.budget_mode = "envelopes"
    db_session.commit()
    ok, _, _ = can_charge_to_envelope(db_session, user, cat.id, Decimal("99999"), date.today())
    assert ok is True


def test_create_transaction_rejects_when_envelope_empty(client, db_session, user):
    acc = models.Account(name="b", type=models.AccountType.CHECKING, balance=Decimal("0"), currency="ARS", user_id=user.id)
    cat = models.Category(name="Salidas", type=models.CategoryType.EXPENSE, user_id=user.id)
    db_session.add_all([acc, cat]); db_session.commit()
    db_session.add(models.Budget(
        user_id=user.id, category_id=cat.id, amount=Decimal("1000"),
        period=models.BudgetPeriod.MONTHLY, start_date=date.today().replace(day=1),
        is_strict=True,  # modo chanchito per-budget (reemplazó al budget_mode global, #65f000e)
    ))
    db_session.commit()

    payload = {
        "accountId": acc.id, "categoryId": cat.id,
        "amount": -2000, "description": "Cena cara",
        "transactionDate": date.today().isoformat(),
    }
    r = client.post("/api/transactions/", json=payload)
    assert r.status_code == 409
    body = r.json()["detail"]
    assert body["code"] == "envelope_empty"


def test_mode_toggle_endpoint(client, db_session, user):
    r = client.get("/api/budgets/mode")
    assert r.status_code == 200
    assert r.json()["mode"] == "standard"

    r = client.put("/api/budgets/mode", json={"mode": "envelopes"})
    assert r.status_code == 200
    assert r.json()["mode"] == "envelopes"

    r = client.get("/api/budgets/mode")
    assert r.json()["mode"] == "envelopes"
