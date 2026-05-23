"""Tests del procesador de recurrentes — foco en catch-up (#36)."""
from decimal import Decimal
from datetime import date, timedelta
from app.database import models


def test_catch_up_generates_multiple_when_days_missed(db_session, user, monkeypatch):
    # Importamos acá para que conftest haya seteado env vars.
    from app.modules.recurring import recurring_processor

    acc = models.Account(name="Sueldo Acc", type=models.AccountType.CHECKING,
                        balance=Decimal("0"), currency="ARS", user_id=user.id)
    cat = models.Category(name="Sueldo", type=models.CategoryType.INCOME, user_id=user.id, is_default=False)
    db_session.add(acc); db_session.add(cat); db_session.commit(); db_session.refresh(acc); db_session.refresh(cat)

    # Recurrente diaria que arrancó hace 5 días.
    start = date.today() - timedelta(days=5)
    rt = models.RecurringTransaction(
        user_id=user.id, account_id=acc.id, category_id=cat.id,
        amount=Decimal("100"), description="Daily ping",
        frequency=models.RecurrenceFrequency.DAILY,
        start_date=start, next_date=start, is_active=True,
    )
    db_session.add(rt); db_session.commit()

    # Patcheamos SessionLocal del processor para que use nuestra sesión de test.
    class _FakeSL:
        def __call__(self):
            return _Wrapped(db_session)

    class _Wrapped:
        def __init__(self, s): self._s = s
        def __getattr__(self, item): return getattr(self._s, item)
        def close(self): pass  # No cerramos — pytest lo hace.

    monkeypatch.setattr(recurring_processor, "SessionLocal", _FakeSL())
    # Sin Postgres, _try_acquire_lock devuelve True por el except.
    recurring_processor.process_recurring_transactions()

    db_session.refresh(acc)
    # 6 tx (días -5,-4,-3,-2,-1,0) × 100 = 600
    txs = db_session.query(models.Transaction).filter(models.Transaction.recurring_id == rt.id).all()
    assert len(txs) == 6
    assert Decimal(str(acc.balance)) == Decimal("600")
    # next_date avanzó al día siguiente de hoy.
    db_session.refresh(rt)
    assert rt.next_date == date.today() + timedelta(days=1)
