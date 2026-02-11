from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List
from datetime import date
from app.database import models
from app.database.database import get_db
from app.core.deps import get_current_user
from app import schemas

router = APIRouter(prefix="/recurring", tags=["recurring"])

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
