from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List
from datetime import date, timedelta
from decimal import Decimal
from app.database import models
from app.database.database import get_db
from app.core.deps import get_current_user
from app import schemas
from app.modules.recurring.recurring_suggestions import (
    TxLite,
    detect_subscriptions,
    normalize_description,
)

router = APIRouter(prefix="/recurring", tags=["recurring"])

# Ventana histórica que escaneamos para detectar suscripciones (≈ 6 meses).
SUGGESTION_LOOKBACK_DAYS = 200

@router.get("/", response_model=List[schemas.RecurringTransaction])
def get_recurring(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return db.query(models.RecurringTransaction).filter(
        models.RecurringTransaction.user_id == current_user.id
    ).options(
        joinedload(models.RecurringTransaction.category),
        joinedload(models.RecurringTransaction.account)
    ).all()

@router.post("/", response_model=schemas.RecurringTransaction)
def create_recurring(
    rt_in: schemas.RecurringTransactionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    new_rt = models.RecurringTransaction(
        **rt_in.model_dump(),
        user_id=current_user.id,
        next_date=rt_in.start_date
    )
    db.add(new_rt)
    db.commit()
    db.refresh(new_rt)
    return new_rt

@router.put("/{rt_id}", response_model=schemas.RecurringTransaction)
def update_recurring(
    rt_id: str,
    rt_update: schemas.RecurringTransactionUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    rt = db.query(models.RecurringTransaction).filter(
        models.RecurringTransaction.id == rt_id,
        models.RecurringTransaction.user_id == current_user.id
    ).first()
    if not rt:
        raise HTTPException(status_code=404, detail="Transacción recurrente no encontrada")
    
    update_data = rt_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(rt, key, value)
        
    db.commit()
    db.refresh(rt)
    return rt

@router.delete("/{rt_id}")
def delete_recurring(
    rt_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    rt = db.query(models.RecurringTransaction).filter(
        models.RecurringTransaction.id == rt_id,
        models.RecurringTransaction.user_id == current_user.id
    ).first()
    if not rt:
        raise HTTPException(status_code=404, detail="No encontrada")
    db.delete(rt)
    db.commit()
    return {"message": "Eliminada"}


@router.get("/suggestions", response_model=schemas.SubscriptionSuggestionList)
def get_recurring_suggestions(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Devuelve transacciones que parecen suscripciones no marcadas: 3+ cargos de
    descripción equivalente, intervalos ~30 días (±5) y montos similares (±10%).
    """
    cutoff = date.today() - timedelta(days=SUGGESTION_LOOKBACK_DAYS)

    txs = (
        db.query(models.Transaction)
        .join(models.Account)
        .filter(
            models.Account.user_id == current_user.id,
            models.Transaction.recurring_id.is_(None),
            models.Transaction.amount < 0,
            models.Transaction.transaction_date >= cutoff,
        )
        .all()
    )

    lite = [
        TxLite(
            id=t.id,
            description=t.description,
            amount=Decimal(str(t.amount)),
            transaction_date=t.transaction_date,
            category_id=t.category_id,
            account_id=t.account_id,
            recurring_id=t.recurring_id,
        )
        for t in txs
    ]

    # Excluir keys que ya tengan una recurrente activa (no queremos duplicar Netflix).
    active_keys = {
        normalize_description(rt.description)
        for rt in db.query(models.RecurringTransaction).filter(
            models.RecurringTransaction.user_id == current_user.id,
            models.RecurringTransaction.is_active == True,  # noqa: E712
        ).all()
    }

    suggestions = [
        s for s in detect_subscriptions(lite) if s.key not in active_keys
    ]
    return {"suggestions": suggestions}


@router.post("/from-suggestion", response_model=schemas.SubscriptionFromSuggestionResult)
def create_recurring_from_suggestion(
    payload: schemas.SubscriptionFromSuggestionRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Convierte una o varias sugerencias en RecurringTransaction. Valida ownership
    de cuenta/categoría y enlaza las transacciones históricas (recurring_id) para
    que dejen de aparecer como sugerencia.
    """
    created: list[models.RecurringTransaction] = []
    skipped = 0

    for item in payload.items:
        account = db.query(models.Account).filter(
            models.Account.id == item.account_id,
            models.Account.user_id == current_user.id,
        ).first()
        category = db.query(models.Category).filter(
            models.Category.id == item.category_id,
        ).first()
        if not account or not category:
            skipped += 1
            continue
        # Categoría debe pertenecer al user o ser default.
        if category.user_id and category.user_id != current_user.id:
            skipped += 1
            continue

        # next_date = última fecha + ~30 días, sin retroceder.
        next_date = item.last_transaction_date + timedelta(days=30)
        if next_date <= date.today():
            next_date = date.today() + timedelta(days=1)

        rt = models.RecurringTransaction(
            user_id=current_user.id,
            account_id=item.account_id,
            category_id=item.category_id,
            amount=item.average_amount,
            description=item.sample_description,
            frequency=item.frequency,
            start_date=item.last_transaction_date,
            next_date=next_date,
            is_active=True,
        )
        db.add(rt)
        db.flush()  # asegurar rt.id antes de linkear las históricas.

        if item.transaction_ids:
            (
                db.query(models.Transaction)
                .filter(
                    models.Transaction.id.in_(item.transaction_ids),
                    models.Transaction.recurring_id.is_(None),
                )
                .update({"recurring_id": rt.id}, synchronize_session=False)
            )
        created.append(rt)

    db.commit()
    for rt in created:
        db.refresh(rt)

    return {"created": created, "skipped": skipped}
