"""Tests del hook de auto-depósito en metas (#56)."""
from decimal import Decimal
from datetime import date

from app.database import models
from app.modules.savings.auto_deposit import apply_auto_deposit_rules


def _setup(db_session, user):
    acc = models.Account(name="Banco", type=models.AccountType.CHECKING, balance=Decimal("0"), currency="ARS", user_id=user.id)
    cat_in = models.Category(name="Sueldo", type=models.CategoryType.INCOME, user_id=user.id, is_default=True)
    cat_out = models.Category(name="Comida", type=models.CategoryType.EXPENSE, user_id=user.id, is_default=True)
    goal = models.SavingGoal(name="Vacaciones", target_amount=Decimal("100000"), current_amount=Decimal("0"), user_id=user.id)
    db_session.add_all([acc, cat_in, cat_out, goal])
    db_session.commit()
    for o in (acc, cat_in, cat_out, goal):
        db_session.refresh(o)
    return acc, cat_in, cat_out, goal


def test_percentage_rule_deposits_on_matching_income(db_session, user):
    acc, cat_in, cat_out, goal = _setup(db_session, user)
    rule = models.GoalRule(user_id=user.id, goal_id=goal.id, trigger_category_id=cat_in.id, percentage=Decimal("10"))
    db_session.add(rule); db_session.commit()

    tx = models.Transaction(
        account_id=acc.id, category_id=cat_in.id, amount=Decimal("500000"),
        description="Sueldo", transaction_date=date.today(),
    )
    db_session.add(tx); db_session.flush()

    affected = apply_auto_deposit_rules(db_session, tx)
    db_session.commit(); db_session.refresh(goal)
    assert len(affected) == 1
    assert goal.current_amount == Decimal("50000.00")


def test_fixed_amount_rule(db_session, user):
    acc, cat_in, cat_out, goal = _setup(db_session, user)
    rule = models.GoalRule(user_id=user.id, goal_id=goal.id, trigger_category_id=cat_in.id, fixed_amount=Decimal("25000"))
    db_session.add(rule); db_session.commit()

    tx = models.Transaction(
        account_id=acc.id, category_id=cat_in.id, amount=Decimal("100000"),
        description="Sueldo", transaction_date=date.today(),
    )
    db_session.add(tx); db_session.flush()
    apply_auto_deposit_rules(db_session, tx)
    db_session.commit(); db_session.refresh(goal)
    assert goal.current_amount == Decimal("25000.00")


def test_ignored_for_expenses(db_session, user):
    acc, cat_in, cat_out, goal = _setup(db_session, user)
    rule = models.GoalRule(user_id=user.id, goal_id=goal.id, trigger_category_id=cat_out.id, percentage=Decimal("10"))
    db_session.add(rule); db_session.commit()

    tx = models.Transaction(
        account_id=acc.id, category_id=cat_out.id, amount=Decimal("-10000"),
        description="Comida", transaction_date=date.today(),
    )
    db_session.add(tx); db_session.flush()
    affected = apply_auto_deposit_rules(db_session, tx)
    assert affected == []


def test_inactive_rule_skipped(db_session, user):
    acc, cat_in, cat_out, goal = _setup(db_session, user)
    rule = models.GoalRule(user_id=user.id, goal_id=goal.id, trigger_category_id=cat_in.id, percentage=Decimal("10"), is_active=False)
    db_session.add(rule); db_session.commit()

    tx = models.Transaction(
        account_id=acc.id, category_id=cat_in.id, amount=Decimal("500000"),
        description="Sueldo", transaction_date=date.today(),
    )
    db_session.add(tx); db_session.flush()
    affected = apply_auto_deposit_rules(db_session, tx)
    assert affected == []
