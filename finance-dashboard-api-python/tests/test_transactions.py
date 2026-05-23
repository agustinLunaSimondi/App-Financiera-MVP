"""Tests del flujo de transacciones — foco en el balance correctness."""
from decimal import Decimal
from datetime import date
from app.database import models


def _seed_account_and_category(db, user, name="Cuenta Test", balance=0, ctype=models.CategoryType.EXPENSE):
    acc = models.Account(name=name, type=models.AccountType.CHECKING, balance=Decimal(str(balance)),
                        currency="ARS", user_id=user.id)
    cat = models.Category(name=f"Cat {name}", type=ctype, user_id=user.id, is_default=False)
    db.add(acc); db.add(cat); db.commit(); db.refresh(acc); db.refresh(cat)
    return acc, cat


def test_create_transaction_updates_balance(client, db_session, user):
    acc, cat = _seed_account_and_category(db_session, user, balance=1000)
    r = client.post("/api/transactions/", json={
        "accountId": acc.id, "categoryId": cat.id, "amount": -300,
        "description": "Café", "transactionDate": str(date.today()),
    })
    assert r.status_code == 200, r.text
    db_session.refresh(acc)
    assert Decimal(str(acc.balance)) == Decimal("700")


def test_update_transaction_same_account_recomputes_balance(client, db_session, user):
    acc, cat = _seed_account_and_category(db_session, user, balance=0)
    r1 = client.post("/api/transactions/", json={
        "accountId": acc.id, "categoryId": cat.id, "amount": -100,
        "description": "x", "transactionDate": str(date.today()),
    })
    tx_id = r1.json()["id"]
    db_session.refresh(acc)
    assert Decimal(str(acc.balance)) == Decimal("-100")

    # Cambiar el monto del tx
    r2 = client.put(f"/api/transactions/{tx_id}", json={"amount": -500})
    assert r2.status_code == 200, r2.text
    db_session.refresh(acc)
    # Balance debería ser exactamente -500 (no -600 ni -400)
    assert Decimal(str(acc.balance)) == Decimal("-500")


def test_update_transaction_change_account_moves_balance(client, db_session, user):
    acc_a, cat = _seed_account_and_category(db_session, user, name="A", balance=0)
    acc_b, _ = _seed_account_and_category(db_session, user, name="B", balance=0)
    r1 = client.post("/api/transactions/", json={
        "accountId": acc_a.id, "categoryId": cat.id, "amount": -200,
        "description": "x", "transactionDate": str(date.today()),
    })
    tx_id = r1.json()["id"]
    db_session.refresh(acc_a); db_session.refresh(acc_b)
    assert Decimal(str(acc_a.balance)) == Decimal("-200")
    assert Decimal(str(acc_b.balance)) == Decimal("0")

    r2 = client.put(f"/api/transactions/{tx_id}", json={"accountId": acc_b.id})
    assert r2.status_code == 200, r2.text
    db_session.refresh(acc_a); db_session.refresh(acc_b)
    # Cuenta A vuelve a 0, cuenta B se queda con -200.
    assert Decimal(str(acc_a.balance)) == Decimal("0")
    assert Decimal(str(acc_b.balance)) == Decimal("-200")


def test_delete_transaction_reverts_balance(client, db_session, user):
    acc, cat = _seed_account_and_category(db_session, user, balance=1000)
    r = client.post("/api/transactions/", json={
        "accountId": acc.id, "categoryId": cat.id, "amount": -250,
        "description": "x", "transactionDate": str(date.today()),
    })
    tx_id = r.json()["id"]
    client.delete(f"/api/transactions/{tx_id}")
    db_session.refresh(acc)
    assert Decimal(str(acc.balance)) == Decimal("1000")


def test_pagination_limit_capped(client, db_session, user):
    acc, cat = _seed_account_and_category(db_session, user)
    r = client.get("/api/transactions/", params={"limit": 99999})
    assert r.status_code == 200
    # No debe aceptar 99999 — capped a MAX_PAGE_LIMIT (200).
    assert r.json()["pagination"]["limit"] <= 200
