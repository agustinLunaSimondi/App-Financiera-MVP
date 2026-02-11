from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import date
from app.database import models
from app.database.database import get_db
from app.core.deps import get_current_user
from app import schemas

router = APIRouter(prefix="/transactions", tags=["transactions"])

@router.get("/")
def get_transactions(
    page: int = 1,
    limit: int = 50,
    startDate: Optional[date] = None,
    endDate: Optional[date] = None,
    type: Optional[str] = None,
    categoryId: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    query = db.query(models.Transaction).join(models.Account).filter(models.Account.user_id == current_user.id)
    
    if startDate:
        query = query.filter(models.Transaction.transaction_date >= startDate)
    if endDate:
        query = query.filter(models.Transaction.transaction_date <= endDate)
    if categoryId:
        query = query.filter(models.Transaction.category_id == categoryId)
    if type:
        query = query.join(models.Category).filter(models.Category.type == type)
    if search:
        query = query.filter(models.Transaction.description.ilike(f"%{search}%"))
        
    total = query.count()
    transactions = query.options(
        joinedload(models.Transaction.category), 
        joinedload(models.Transaction.account)
    ).order_by(models.Transaction.transaction_date.desc()).offset((page-1)*limit).limit(limit).all()
    
    serialized = [schemas.Transaction.model_validate(tx).model_dump(by_alias=True) for tx in transactions]
    return {
        "transactions": jsonable_encoder(serialized),
        "pagination": {
            "total": total,
            "limit": limit,
            "page": page,
            "hasMore": (page * limit) < total
        }
    }

@router.post("/", response_model=schemas.Transaction)
def create_transaction(
    tx_in: schemas.TransactionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    account = db.query(models.Account).filter(
        models.Account.id == tx_in.account_id,
        models.Account.user_id == current_user.id
    ).first()
    if not account:
        raise HTTPException(status_code=404, detail="Cuenta no encontrada")
    
    new_tx = models.Transaction(**tx_in.model_dump())
    db.add(new_tx)
    
    # Lógica aditiva: si es gasto, el frontend envía monto negativo
    account.balance += tx_in.amount
        
    db.commit()
    db.refresh(new_tx)
    return new_tx

@router.put("/{tx_id}", response_model=schemas.Transaction)
def update_transaction(
    tx_id: str,
    tx_update: schemas.TransactionUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    tx = db.query(models.Transaction).join(models.Account).filter(
        models.Transaction.id == tx_id,
        models.Account.user_id == current_user.id
    ).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transacción no encontrada")
    
    # Revertir balance anterior (restamos lo que sumamos antes)
    tx.account.balance -= tx.amount
        
    # Aplicar nuevos datos
    update_data = tx_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(tx, key, value)
    
    # Aplicar nuevo balance (sumamos el nuevo monto a la cuenta que corresponda)
    new_account = db.query(models.Account).filter(models.Account.id == tx.account_id).first()
    new_account.balance += tx.amount
        
    db.commit()
    db.refresh(tx)
    return tx

@router.delete("/{tx_id}")
def delete_transaction(
    tx_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    tx = db.query(models.Transaction).join(models.Account).filter(
        models.Transaction.id == tx_id,
        models.Account.user_id == current_user.id
    ).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transacción no encontrada")
    
    # Revertir balance
    tx.account.balance -= tx.amount
        
    db.delete(tx)
    db.commit()
    return {"message": "Transacción eliminada"}
