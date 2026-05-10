"""
Tests unitarios de los schemas Pydantic — no requieren servidor ni base de datos.

Verifica que los validators de fechas convierten strings vacíos a None,
evitando los errores 422 reportados en el QA.

Uso:
    cd finance-dashboard-api-python
    python -m pytest test_schemas.py -v   # con pytest
    # o ejecutar directamente:
    python test_schemas.py
"""
import sys
from datetime import date
from decimal import Decimal

from app import schemas


def expect(label, fn):
    try:
        fn()
        print(f"  ✓ {label}")
        return True
    except AssertionError as e:
        print(f"  ❌ {label}: {e}")
        return False
    except Exception as e:
        print(f"  ❌ {label}: excepción inesperada: {e!r}")
        return False


def test_savinggoal_create_with_empty_deadline():
    """Bug QA #2: deadline='' debe convertirse a None, no fallar con 422."""
    g = schemas.SavingGoalCreate(
        name="Test",
        targetAmount=Decimal("1000"),
        currentAmount=Decimal("0"),
        deadline="",
    )
    assert g.deadline is None, f"deadline esperado None, obtuve {g.deadline!r}"


def test_savinggoal_create_with_no_deadline():
    g = schemas.SavingGoalCreate(
        name="Test", targetAmount=Decimal("1000"), currentAmount=Decimal("0"),
    )
    assert g.deadline is None


def test_savinggoal_create_with_valid_deadline():
    g = schemas.SavingGoalCreate(
        name="Test",
        targetAmount=Decimal("1000"),
        currentAmount=Decimal("0"),
        deadline="2027-01-15",
    )
    assert g.deadline == date(2027, 1, 15)


def test_savinggoal_update_empty_deadline():
    g = schemas.SavingGoalUpdate(deadline="")
    assert g.deadline is None


def test_savinggoal_update_only_currentamount():
    """El depósito sólo envía currentAmount; otros campos no deben fallar."""
    g = schemas.SavingGoalUpdate(currentAmount=Decimal("1500"))
    assert g.current_amount == Decimal("1500")
    assert g.deadline is None
    assert g.name is None


def test_recurring_create_with_empty_end_date():
    g = schemas.RecurringTransactionCreate(
        accountId="acc-1",
        categoryId="cat-1",
        amount=Decimal("-100"),
        description="Netflix",
        frequency="MONTHLY",
        startDate="2026-05-01",
        endDate="",
        isActive=True,
    )
    assert g.end_date is None


def test_recurring_update_empty_dates():
    g = schemas.RecurringTransactionUpdate(endDate="", startDate="")
    assert g.end_date is None
    assert g.start_date is None


def test_camel_alias_serialization():
    """Verifica que las aliases camelCase funcionan en ambos sentidos."""
    g = schemas.SavingGoalCreate(
        name="Test",
        targetAmount=Decimal("1000"),
        currentAmount=Decimal("100"),
    )
    dumped = g.model_dump(by_alias=True)
    assert "targetAmount" in dumped, f"campo camelCase faltante: {dumped}"
    assert "currentAmount" in dumped


def main():
    print("=== Tests unitarios de schemas Pydantic ===\n")
    tests = [
        ("SavingGoal.create con deadline=''", test_savinggoal_create_with_empty_deadline),
        ("SavingGoal.create sin deadline", test_savinggoal_create_with_no_deadline),
        ("SavingGoal.create con deadline válida", test_savinggoal_create_with_valid_deadline),
        ("SavingGoal.update con deadline=''", test_savinggoal_update_empty_deadline),
        ("SavingGoal.update sólo currentAmount (depósito)", test_savinggoal_update_only_currentamount),
        ("Recurring.create con endDate=''", test_recurring_create_with_empty_end_date),
        ("Recurring.update con fechas vacías", test_recurring_update_empty_dates),
        ("Aliases camelCase", test_camel_alias_serialization),
    ]
    passed = sum(expect(name, fn) for name, fn in tests)
    total = len(tests)
    print(f"\n{passed}/{total} tests pasaron")
    if passed != total:
        sys.exit(1)


if __name__ == "__main__":
    main()
