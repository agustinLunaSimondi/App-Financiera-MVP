"""Tests para public widgets (#64)."""
from datetime import date, datetime, timedelta
from decimal import Decimal

from app.database import models


def test_create_balance_widget(client, db_session, user):
    db_session.add(models.Account(
        name="b", type=models.AccountType.CHECKING,
        balance=Decimal("12345.67"), currency="ARS", user_id=user.id,
    ))
    db_session.commit()
    r = client.post("/api/widgets/", json={"type": "balance"})
    assert r.status_code == 200
    body = r.json()
    assert body["type"] == "balance"
    assert body["token"]
    assert body["embedUrl"].startswith("/widget/")


def test_goal_widget_requires_owned_goal(client, db_session, user):
    # Sin goalId → 400
    r = client.post("/api/widgets/", json={"type": "goal", "config": {}})
    assert r.status_code == 400

    # Goal de otro user → 404
    r = client.post("/api/widgets/", json={"type": "goal", "config": {"goalId": "nope"}})
    assert r.status_code == 404

    g = models.SavingGoal(
        name="Vacaciones", target_amount=Decimal("100000"),
        current_amount=Decimal("25000"), user_id=user.id,
    )
    db_session.add(g); db_session.commit()
    r = client.post("/api/widgets/", json={"type": "goal", "config": {"goalId": g.id}})
    assert r.status_code == 200


def test_public_endpoint_returns_balance(client, db_session, user):
    db_session.add(models.Account(
        name="b", type=models.AccountType.CHECKING,
        balance=Decimal("5000"), currency="ARS", user_id=user.id,
    ))
    db_session.commit()
    r = client.post("/api/widgets/", json={"type": "balance"})
    token = r.json()["token"]
    # Public — sin token de auth (igual lo overrideamos en tests, no nos importa)
    r = client.get(f"/api/widgets/public/{token}")
    assert r.status_code == 200
    body = r.json()
    assert body["type"] == "balance"
    assert body["data"]["totalBalance"] == 5000.0


def test_public_endpoint_returns_goal_progress(client, db_session, user):
    g = models.SavingGoal(
        name="Notebook", target_amount=Decimal("1000000"),
        current_amount=Decimal("250000"), user_id=user.id,
    )
    db_session.add(g); db_session.commit()
    create = client.post("/api/widgets/", json={"type": "goal", "config": {"goalId": g.id}})
    token = create.json()["token"]
    r = client.get(f"/api/widgets/public/{token}")
    assert r.status_code == 200
    data = r.json()["data"]
    assert data["progressPct"] == 25.0
    assert data["name"] == "Notebook"


def test_public_endpoint_unknown_token_404(client, db_session, user):
    r = client.get("/api/widgets/public/nonexistent")
    assert r.status_code == 404


def test_public_endpoint_expired_token_410(client, db_session, user):
    w = models.PublicWidget(
        user_id=user.id, token="exp-token",
        type="balance", expires_at=datetime.utcnow() - timedelta(hours=1),
    )
    db_session.add(w); db_session.commit()
    r = client.get("/api/widgets/public/exp-token")
    assert r.status_code == 410


def test_rotate_changes_token(client, db_session, user):
    r = client.post("/api/widgets/", json={"type": "balance"})
    w_id = r.json()["id"]
    old_token = r.json()["token"]
    r2 = client.post(f"/api/widgets/{w_id}/rotate")
    assert r2.status_code == 200
    new_token = r2.json()["token"]
    assert new_token != old_token
    # El viejo ya no resuelve
    assert client.get(f"/api/widgets/public/{old_token}").status_code == 404
    assert client.get(f"/api/widgets/public/{new_token}").status_code == 200


def test_delete_widget(client, db_session, user):
    r = client.post("/api/widgets/", json={"type": "balance"})
    w_id = r.json()["id"]
    assert client.delete(f"/api/widgets/{w_id}").status_code == 200
    assert client.get("/api/widgets/").json() == []


def test_month_spend_widget_aggregates_only_expenses(client, db_session, user):
    acc = models.Account(name="b", type=models.AccountType.CHECKING, balance=Decimal("0"), currency="ARS", user_id=user.id)
    cat = models.Category(name="x", type=models.CategoryType.EXPENSE, user_id=user.id)
    db_session.add_all([acc, cat]); db_session.commit()
    today = date.today()
    db_session.add_all([
        models.Transaction(account_id=acc.id, category_id=cat.id, amount=Decimal("-1000"), description="a", transaction_date=today),
        models.Transaction(account_id=acc.id, category_id=cat.id, amount=Decimal("500"), description="ingreso", transaction_date=today),
    ])
    db_session.commit()
    r = client.post("/api/widgets/", json={"type": "month_spend"})
    token = r.json()["token"]
    r = client.get(f"/api/widgets/public/{token}")
    assert r.status_code == 200
    data = r.json()["data"]
    assert data["spent"] == 1000.0
    assert data["txCount"] == 1
