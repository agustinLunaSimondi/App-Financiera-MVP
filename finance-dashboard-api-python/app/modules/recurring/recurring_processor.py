"""
Procesador de transacciones recurrentes.

Diseñado para correr cada hora vía APScheduler (ver main.py).
Idempotente y safe-to-run con múltiples workers: usa pg_try_advisory_lock
para que solo una instancia procese en cada tick. Sin esto, dos workers
duplicarían las transacciones generadas.
"""
import logging
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import date, timedelta
from dateutil.relativedelta import relativedelta
from decimal import Decimal
from app.database import models
from app.database.database import SessionLocal
from app.modules.savings.auto_deposit import apply_auto_deposit_rules

logger = logging.getLogger(__name__)

# Cualquier int64 estable. Si cambiamos esto, todos los workers tienen que coincidir.
RECURRING_LOCK_KEY = 859203741


def get_next_date(current_date: date, frequency: models.RecurrenceFrequency):
    if frequency == models.RecurrenceFrequency.DAILY:
        return current_date + timedelta(days=1)
    elif frequency == models.RecurrenceFrequency.WEEKLY:
        return current_date + timedelta(weeks=1)
    elif frequency == models.RecurrenceFrequency.BIWEEKLY:
        return current_date + timedelta(weeks=2)
    elif frequency == models.RecurrenceFrequency.MONTHLY:
        return current_date + relativedelta(months=1)
    elif frequency == models.RecurrenceFrequency.YEARLY:
        return current_date + relativedelta(years=1)
    return current_date


def _try_acquire_lock(db: Session) -> bool:
    """pg_try_advisory_lock: True si obtuvimos el lock, False si otro worker lo tiene."""
    try:
        result = db.execute(text("SELECT pg_try_advisory_lock(:k)"), {"k": RECURRING_LOCK_KEY}).scalar()
        return bool(result)
    except Exception:
        # Si no es Postgres (test/SQLite) seguimos sin lock — modo "best effort".
        return True


def _release_lock(db: Session) -> None:
    try:
        db.execute(text("SELECT pg_advisory_unlock(:k)"), {"k": RECURRING_LOCK_KEY})
    except Exception:
        pass


def process_recurring_transactions():
    db: Session = SessionLocal()
    today = date.today()

    if not _try_acquire_lock(db):
        logger.info("Otro worker está procesando recurrentes — skip.")
        db.close()
        return

    try:
        pending = db.query(models.RecurringTransaction).filter(
            models.RecurringTransaction.is_active == True,  # noqa: E712
            models.RecurringTransaction.next_date <= today,
            (models.RecurringTransaction.end_date == None) | (models.RecurringTransaction.end_date >= today)  # noqa: E711
        ).all()

        total_created = 0
        for rt in pending:
            # Iterar hasta ponerse al día si el scheduler estuvo caído varios días.
            iterations = 0
            while rt.is_active and rt.next_date <= today:
                # Lock de la cuenta dentro del loop para evitar lost-updates.
                account = db.query(models.Account).filter(
                    models.Account.id == rt.account_id
                ).with_for_update().first()
                if not account:
                    logger.warning(f"Recurrente {rt.id} apunta a cuenta inexistente — desactivando")
                    rt.is_active = False
                    break

                new_tx = models.Transaction(
                    account_id=rt.account_id,
                    category_id=rt.category_id,
                    recurring_id=rt.id,
                    amount=rt.amount,
                    description=f"[Recurrente] {rt.description}",
                    transaction_date=rt.next_date,
                    source="recurring",
                )
                db.add(new_tx)
                account.balance = (account.balance or Decimal("0")) + Decimal(str(rt.amount))

                # Auto-depósito en metas (#56): un ingreso recurrente (ej. sueldo) también
                # debe disparar las reglas. flush() para que new_tx.account resuelva antes.
                db.flush()
                apply_auto_deposit_rules(db, new_tx)

                rt.next_date = get_next_date(rt.next_date, rt.frequency)

                if rt.end_date and rt.next_date > rt.end_date:
                    rt.is_active = False
                    break

                iterations += 1
                total_created += 1
                # Guardia contra loops infinitos en frecuencias mal definidas (1000 ticks max por recurrente por tick).
                if iterations > 1000:
                    logger.error(f"Recurrente {rt.id} excedió 1000 iteraciones en un tick — abortando")
                    break

        db.commit()
        if total_created:
            logger.info(f"Recurrentes procesadas: {total_created} transacciones generadas")
    except Exception as e:
        logger.exception(f"Error procesando recurrentes: {e}")
        db.rollback()
    finally:
        _release_lock(db)
        db.close()
