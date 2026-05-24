"""Tests para reporte AFIP (#63)."""
from datetime import date
from decimal import Decimal

from app.database import models
from app.modules.reports.tax_report import (
    collect_deductible_transactions, render_excel_detail, render_pdf_summary,
)


def _setup_deductible_data(db_session, user):
    acc = models.Account(name="b", type=models.AccountType.CHECKING, balance=Decimal("0"), currency="ARS", user_id=user.id)
    deduct = models.Category(
        name="Servicios", type=models.CategoryType.EXPENSE,
        user_id=user.id, tax_deductible=True,
    )
    other = models.Category(
        name="Comida", type=models.CategoryType.EXPENSE,
        user_id=user.id, tax_deductible=False,
    )
    db_session.add_all([acc, deduct, other]); db_session.commit()

    txs = [
        models.Transaction(account_id=acc.id, category_id=deduct.id, amount=Decimal("-12000"), description="Internet Mayo", transaction_date=date(2026, 5, 5)),
        models.Transaction(account_id=acc.id, category_id=deduct.id, amount=Decimal("-8000"), description="Luz Mayo", transaction_date=date(2026, 5, 10)),
        models.Transaction(account_id=acc.id, category_id=other.id, amount=Decimal("-5000"), description="Almuerzo", transaction_date=date(2026, 5, 6)),
    ]
    db_session.add_all(txs); db_session.commit()
    return acc, deduct, other


def test_collect_only_deductible_categories(db_session, user):
    _setup_deductible_data(db_session, user)
    rows = collect_deductible_transactions(db_session, user.id, date(2026, 5, 1), date(2026, 5, 31))
    assert len(rows) == 2
    total = sum(r.amount for r in rows)
    assert total == Decimal("20000")


def test_collect_filter_by_category_ids(db_session, user):
    _, deduct, _ = _setup_deductible_data(db_session, user)
    rows = collect_deductible_transactions(
        db_session, user.id, date(2026, 5, 1), date(2026, 5, 31), category_ids=[deduct.id],
    )
    assert all(r.category == "Servicios" for r in rows)


def test_collect_outside_range_returns_empty(db_session, user):
    _setup_deductible_data(db_session, user)
    rows = collect_deductible_transactions(db_session, user.id, date(2026, 6, 1), date(2026, 6, 30))
    assert rows == []


def test_render_pdf_returns_bytes(db_session, user):
    _setup_deductible_data(db_session, user)
    rows = collect_deductible_transactions(db_session, user.id, date(2026, 5, 1), date(2026, 5, 31))
    pdf = render_pdf_summary(user.name, date(2026, 5, 1), date(2026, 5, 31), rows)
    assert isinstance(pdf, bytes)
    assert pdf.startswith(b"%PDF")


def test_render_excel_returns_bytes(db_session, user):
    _setup_deductible_data(db_session, user)
    rows = collect_deductible_transactions(db_session, user.id, date(2026, 5, 1), date(2026, 5, 31))
    xlsx = render_excel_detail(user.name, date(2026, 5, 1), date(2026, 5, 31), rows)
    assert isinstance(xlsx, bytes)
    # Excel files start with PK (zip)
    assert xlsx[:2] == b"PK"


def test_endpoint_returns_pdf(client, db_session, user):
    _setup_deductible_data(db_session, user)
    r = client.post("/api/reports/tax-deductible", json={
        "startDate": "2026-05-01", "endDate": "2026-05-31", "format": "pdf",
    })
    assert r.status_code == 200
    assert r.headers["content-type"] == "application/pdf"
    assert r.content.startswith(b"%PDF")


def test_endpoint_returns_excel(client, db_session, user):
    _setup_deductible_data(db_session, user)
    r = client.post("/api/reports/tax-deductible", json={
        "startDate": "2026-05-01", "endDate": "2026-05-31", "format": "excel",
    })
    assert r.status_code == 200
    assert "spreadsheet" in r.headers["content-type"]


def test_endpoint_validates_range(client, db_session, user):
    r = client.post("/api/reports/tax-deductible", json={
        "startDate": "2026-12-31", "endDate": "2026-01-01", "format": "pdf",
    })
    assert r.status_code == 400


def test_deductible_categories_endpoint(client, db_session, user):
    _setup_deductible_data(db_session, user)
    r = client.get("/api/reports/deductible-categories")
    assert r.status_code == 200
    names = {c["name"] for c in r.json()}
    assert "Servicios" in names
    assert "Comida" not in names
