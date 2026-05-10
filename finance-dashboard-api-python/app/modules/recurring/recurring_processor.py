from sqlalchemy.orm import Session
from datetime import date, timedelta
from dateutil.relativedelta import relativedelta
from app.database import models
from app.database.database import SessionLocal

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

def process_recurring_transactions():
    print("Iniciando procesamiento de transacciones recurrentes...")
    db = SessionLocal()
    today = date.today()
    
    try:
        # Buscar transacciones activas cuya next_date sea hoy o anterior
        pending = db.query(models.RecurringTransaction).filter(
            models.RecurringTransaction.is_active == True,
            models.RecurringTransaction.next_date <= today,
            (models.RecurringTransaction.end_date == None) | (models.RecurringTransaction.end_date >= today)
        ).all()
        
        for rt in pending:
            # Crear la transacción real
            new_tx = models.Transaction(
                account_id=rt.account_id,
                category_id=rt.category_id,
                recurring_id=rt.id,
                amount=rt.amount,
                description=f"[Recurrente] {rt.description}",
                transaction_date=rt.next_date
            )
            db.add(new_tx)

            # El monto en `rt.amount` está firmado (negativo = gasto, positivo = ingreso),
            # consistente con transaction_routes.create_transaction. Sumar el signo es correcto.
            rt.account.balance += rt.amount

            # Actualizar next_date de la recurrente
            rt.next_date = get_next_date(rt.next_date, rt.frequency)

            # Si pasamos la fecha fin, desactivar
            if rt.end_date and rt.next_date > rt.end_date:
                rt.is_active = False

        db.commit()
    except Exception as e:
        print(f"Error procesando recurrentes: {e}")
        db.rollback()
    finally:
        db.close()
