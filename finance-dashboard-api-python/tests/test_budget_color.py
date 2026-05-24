"""Tests para el campo color custom en presupuestos."""
from datetime import date
from decimal import Decimal

from app.database import models


def test_create_budget_with_color(client, db_session, user):
    cat = models.Category(name="Salidas", type=models.CategoryType.EXPENSE, user_id=user.id)
    db_session.add(cat); db_session.commit()
    payload = {
        "categoryId": cat.id,
        "amount": 10000,
        "period": "MONTHLY",
        "startDate": date.today().isoformat(),
        "color": "#8B5CF6",
    }
    r = client.post("/api/budgets/", json=payload)
    assert r.status_code == 200
    assert r.json()["color"] == "#8B5CF6"


def test_update_budget_color(client, db_session, user):
    cat = models.Category(name="Salidas", type=models.CategoryType.EXPENSE, user_id=user.id)
    db_session.add(cat); db_session.commit()
    b = models.Budget(
        user_id=user.id, category_id=cat.id, amount=Decimal("5000"),
        period=models.BudgetPeriod.MONTHLY, start_date=date.today(),
    )
    db_session.add(b); db_session.commit()

    r = client.put(f"/api/budgets/{b.id}", json={"color": "#10B981"})
    assert r.status_code == 200
    assert r.json()["color"] == "#10B981"


def test_budget_without_color_returns_null(client, db_session, user):
    """Budgets creados antes de la migración o sin color deben devolver null."""
    cat = models.Category(name="Salidas", type=models.CategoryType.EXPENSE, user_id=user.id)
    db_session.add(cat); db_session.commit()
    b = models.Budget(
        user_id=user.id, category_id=cat.id, amount=Decimal("5000"),
        period=models.BudgetPeriod.MONTHLY, start_date=date.today(),
    )
    db_session.add(b); db_session.commit()

    r = client.get("/api/budgets/")
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 1
    assert data[0]["color"] is None
