"""
Pruebas de la integración con Mercado Pago: clasificación ingreso/egreso,
neteo de reembolsos, formato de fecha y la conversión pago -> transacción
(signo, dedup, montos).
"""
from datetime import datetime, timezone
from decimal import Decimal

from app.database import models
from app.modules.mercadopago import mp_service


# --- helpers puros ---------------------------------------------------------

def test_is_expense_income_when_user_is_collector():
    payment = {"collector_id": 999, "payer": {"id": None}}
    assert mp_service._is_expense(payment, "999") is False


def test_is_expense_expense_when_collector_is_other():
    payment = {"collector_id": 123, "payer": {"id": 999}}
    assert mp_service._is_expense(payment, "999") is True


def test_is_expense_expense_when_collector_missing():
    # Operación saliente: MP no puebla collector_id -> egreso.
    payment = {"payer": {}}
    assert mp_service._is_expense(payment, "999") is True


def test_is_expense_handles_int_vs_str_collector_id():
    # collector_id llega como int en el JSON; mp_user_id se guarda como str.
    payment = {"collector_id": 555}
    assert mp_service._is_expense(payment, "555") is False


def test_net_amount_subtracts_refund():
    payment = {"transaction_amount": 1000, "transaction_amount_refunded": 250}
    assert mp_service._net_amount(payment) == Decimal("750")


def test_net_amount_full_refund_is_zero():
    payment = {"transaction_amount": 1000, "transaction_amount_refunded": 1000}
    assert mp_service._net_amount(payment) == Decimal("0")


def test_net_amount_no_refund_field():
    payment = {"transaction_amount": 1000}
    assert mp_service._net_amount(payment) == Decimal("1000")


def test_fmt_mp_datetime_keeps_instant_with_ar_offset():
    # 12:00 UTC == 09:00 -03:00; no debe quedar etiquetado mal.
    dt = datetime(2026, 6, 1, 12, 0, 0, tzinfo=timezone.utc)
    out = mp_service._fmt_mp_datetime(dt)
    assert out.startswith("2026-06-01T09:00:00")
    assert out.endswith("-03:00")


def test_fmt_mp_datetime_naive_treated_as_utc():
    dt = datetime(2026, 6, 1, 3, 0, 0)  # naive -> UTC -> 00:00 -03:00
    out = mp_service._fmt_mp_datetime(dt)
    assert out.startswith("2026-06-01T00:00:00")


# --- sync_payments_to_transactions (con DB real) ---------------------------

def _setup_account_categories(db, user):
    account = mp_service.get_or_create_mp_account(db, user)
    cats = mp_service.get_or_create_mp_categories(db, user)
    return account, cats


def _payment(pid, amount, collector_id=None, status="approved", refunded=0):
    return {
        "id": pid,
        "transaction_amount": amount,
        "transaction_amount_refunded": refunded,
        "status": status,
        "collector_id": collector_id,
        "date_approved": "2026-06-10T10:00:00.000-03:00",
        "date_created": "2026-06-10T10:00:00.000-03:00",
        "payer": {"id": None, "email": "buyer@example.com"},
        "description": f"Pago {pid}",
    }


def _sync(db, user, account, cats, payments, mp_uid="777"):
    return mp_service.sync_payments_to_transactions(
        db=db, user=user, payments=payments,
        default_account_id=account.id,
        default_category_id=cats["MP Pagos"].id,
        income_category_id=cats["MP Cobros"].id,
        mp_user_id=mp_uid,
    )


def test_sync_income_positive_expense_negative(db_session, user):
    account, cats = _setup_account_categories(db_session, user)
    payments = [
        _payment("1", 1000, collector_id=777),   # ingreso
        _payment("2", 400, collector_id=123),     # egreso (otro collector)
    ]
    result = _sync(db_session, user, account, cats, payments)
    assert result["transactions_imported"] == 2
    txs = {t.external_id: t for t in db_session.query(models.Transaction).all()}
    assert txs["mp_1"].amount == Decimal("1000")     # ingreso > 0
    assert txs["mp_1"].category_id == cats["MP Cobros"].id
    assert txs["mp_2"].amount == Decimal("-400")     # egreso < 0
    assert txs["mp_2"].category_id == cats["MP Pagos"].id


def test_sync_skips_pending(db_session, user):
    account, cats = _setup_account_categories(db_session, user)
    payments = [_payment("3", 500, collector_id=777, status="pending")]
    result = _sync(db_session, user, account, cats, payments)
    assert result["transactions_imported"] == 0
    assert result["transactions_skipped"] == 1


def test_sync_is_idempotent(db_session, user):
    account, cats = _setup_account_categories(db_session, user)
    payments = [_payment("4", 800, collector_id=777)]
    first = _sync(db_session, user, account, cats, payments)
    second = _sync(db_session, user, account, cats, payments)
    assert first["transactions_imported"] == 1
    assert second["transactions_imported"] == 0   # dedup por external_id
    assert db_session.query(models.Transaction).count() == 1


def test_sync_refunded_amount_is_netted(db_session, user):
    account, cats = _setup_account_categories(db_session, user)
    payments = [_payment("5", 1000, collector_id=777, refunded=300)]
    _sync(db_session, user, account, cats, payments)
    tx = db_session.query(models.Transaction).filter_by(external_id="mp_5").one()
    assert tx.amount == Decimal("700")   # 1000 - 300


def test_sync_full_refund_skipped(db_session, user):
    account, cats = _setup_account_categories(db_session, user)
    payments = [_payment("6", 1000, collector_id=777, refunded=1000)]
    result = _sync(db_session, user, account, cats, payments)
    assert result["transactions_imported"] == 0
    assert db_session.query(models.Transaction).count() == 0


def test_sync_updates_account_balance(db_session, user):
    account, cats = _setup_account_categories(db_session, user)
    start = account.balance or Decimal("0")
    payments = [
        _payment("7", 1000, collector_id=777),   # +1000
        _payment("8", 400, collector_id=123),     # -400
    ]
    _sync(db_session, user, account, cats, payments)
    db_session.refresh(account)
    assert account.balance == start + Decimal("600")
