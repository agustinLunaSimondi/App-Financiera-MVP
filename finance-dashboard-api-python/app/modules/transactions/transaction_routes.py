from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select
from decimal import Decimal
from typing import List, Optional
from datetime import date
from app.database import models
from app.database.database import get_db
from app.core.deps import get_current_user
from app import schemas
from app.core import posthog_client

router = APIRouter(prefix="/transactions", tags=["transactions"])

# Tope defensivo. Evita que un cliente pida 1M de filas por error o malicia.
MAX_PAGE_LIMIT = 200


def _lock_account_for_update(db: Session, account_id: str, user_id: str) -> Optional[models.Account]:
    """Lockea la fila de Account para evitar lost-updates en balance. Solo dentro de una tx abierta."""
    return db.query(models.Account).filter(
        models.Account.id == account_id,
        models.Account.user_id == user_id,
    ).with_for_update().first()


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
    # Validar límites para evitar `limit=10000` desde el cliente.
    if limit < 1:
        limit = 1
    if limit > MAX_PAGE_LIMIT:
        limit = MAX_PAGE_LIMIT
    if page < 1:
        page = 1

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
    # Lock de la cuenta para que dos requests concurrentes no pisen el balance.
    account = _lock_account_for_update(db, tx_in.account_id, current_user.id)
    if not account:
        raise HTTPException(status_code=404, detail="Cuenta no encontrada")

    new_tx = models.Transaction(**tx_in.model_dump())
    db.add(new_tx)

    # Convención: gasto = negativo, ingreso = positivo. La suma respeta el signo.
    account.balance = (account.balance or Decimal("0")) + Decimal(str(tx_in.amount))

    db.commit()
    db.refresh(new_tx)
    posthog_client.capture(
        current_user.id,
        "transaction_created",
        {"amount": float(tx_in.amount), "account_id": tx_in.account_id}
    )
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

    update_data = tx_update.model_dump(exclude_unset=True)
    old_account_id = tx.account_id
    old_amount = Decimal(str(tx.amount))
    new_account_id = update_data.get("account_id", old_account_id)
    new_amount = Decimal(str(update_data["amount"])) if "amount" in update_data else old_amount

    # Lock de la cuenta vieja (siempre la pertenecía al usuario porque el join lo verificó).
    old_account = _lock_account_for_update(db, old_account_id, current_user.id)
    if not old_account:
        raise HTTPException(status_code=404, detail="Cuenta original no encontrada")

    # Revertir el efecto del monto viejo en la cuenta vieja.
    old_account.balance = (old_account.balance or Decimal("0")) - old_amount

    # Si cambia la cuenta, lockear y validar ownership de la nueva.
    if new_account_id != old_account_id:
        new_account = _lock_account_for_update(db, new_account_id, current_user.id)
        if not new_account:
            raise HTTPException(status_code=404, detail="Cuenta destino no encontrada")
    else:
        new_account = old_account

    # Aplicar todos los updates al modelo.
    for key, value in update_data.items():
        setattr(tx, key, value)

    # Aplicar el nuevo monto en la cuenta destino.
    new_account.balance = (new_account.balance or Decimal("0")) + new_amount

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

    account = _lock_account_for_update(db, tx.account_id, current_user.id)
    if account:
        account.balance = (account.balance or Decimal("0")) - Decimal(str(tx.amount))

    db.delete(tx)
    db.commit()
    return {"message": "Transacción eliminada"}
