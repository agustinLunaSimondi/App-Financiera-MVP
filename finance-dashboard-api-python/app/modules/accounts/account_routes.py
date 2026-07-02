from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from decimal import Decimal
from typing import List
from app.database import models
from app.database.database import get_db
from app.core.deps import get_current_user
from app import schemas

router = APIRouter(prefix="/accounts", tags=["accounts"])


@router.post("/recalculate-balances")
def recalculate_balances(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Recalcula balance = SUM(transactions.amount) por cuenta del usuario.
    Útil para detectar / reparar desajustes acumulados por bugs históricos.
    Devuelve diff por cuenta.
    """
    accounts = (
        db.query(models.Account)
        .filter(models.Account.user_id == current_user.id)
        .with_for_update()
        .all()
    )
    sums = dict(
        db.query(models.Transaction.account_id, func.coalesce(func.sum(models.Transaction.amount), 0))
        .join(models.Account, models.Account.id == models.Transaction.account_id)
        .filter(models.Account.user_id == current_user.id)
        .group_by(models.Transaction.account_id)
        .all()
    )
    report = []
    for acc in accounts:
        computed = Decimal(str(sums.get(acc.id, 0)))
        stored = Decimal(str(acc.balance or 0))
        diff = computed - stored
        acc.balance = computed
        report.append({
            "account_id": acc.id,
            "name": acc.name,
            "previous_balance": float(stored),
            "recalculated_balance": float(computed),
            "diff": float(diff),
        })
    db.commit()
    return {"accounts": report}

@router.get("/", response_model=List[schemas.Account])
def get_accounts(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return db.query(models.Account).filter(models.Account.user_id == current_user.id).all()

@router.post("/", response_model=schemas.Account)
def create_account(
    account_in: schemas.AccountCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    new_account = models.Account(
        **account_in.model_dump(),
        user_id=current_user.id
    )
    db.add(new_account)
    db.commit()
    db.refresh(new_account)
    return new_account

@router.put("/{account_id}", response_model=schemas.Account)
def update_account(
    account_id: str,
    account_update: schemas.AccountUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    account = db.query(models.Account).filter(
        models.Account.id == account_id,
        models.Account.user_id == current_user.id
    ).first()
    if not account:
        raise HTTPException(status_code=404, detail="Cuenta no encontrada")
    
    update_data = account_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(account, key, value)
        
    db.commit()
    db.refresh(account)
    return account

@router.delete("/{account_id}")
def delete_account(
    account_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    account = db.query(models.Account).filter(
        models.Account.id == account_id,
        models.Account.user_id == current_user.id
    ).first()
    if not account:
        raise HTTPException(status_code=404, detail="Cuenta no encontrada")
    db.delete(account)
    db.commit()
    return {"message": "Cuenta eliminada correctamente"}
