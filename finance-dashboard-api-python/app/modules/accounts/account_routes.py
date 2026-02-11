from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import models
from app.database.database import get_db
from app.core.deps import get_current_user
from app import schemas

router = APIRouter(prefix="/accounts", tags=["accounts"])

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
