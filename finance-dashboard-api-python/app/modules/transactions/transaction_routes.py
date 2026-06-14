from fastapi import APIRouter, Depends, HTTPException
from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session, joinedload
from decimal import Decimal
from typing import Optional
from datetime import date
from app.database import models
from app.database.database import get_db
from app.core.deps import get_current_user
from app import schemas
from app.core import posthog_client
from app.modules.savings.auto_deposit import apply_auto_deposit_rules
from app.modules.transactions.embeddings import suggest_categories_for_user
from app.modules.budgets.envelopes import can_charge_to_envelope

router = APIRouter(prefix="/transactions", tags=["transactions"])

# Tope defensivo. Evita que un cliente pida 1M de filas por error o malicia.
MAX_PAGE_LIMIT = 200

# Columnas permitidas para ordenar. Whitelist explícita: evita inyección vía el
# nombre de columna recibido del cliente y limita el orden a campos indexables.
ALLOWED_SORT_COLUMNS = {
    "transaction_date": models.Transaction.transaction_date,
    "amount": models.Transaction.amount,
    "description": models.Transaction.description,
}


def _lock_account_for_update(db: Session, account_id: str, user_id: str) -> Optional[models.Account]:
    """Lockea la fila de Account para evitar lost-updates en balance. Solo dentro de una tx abierta."""
    return db.query(models.Account).filter(
        models.Account.id == account_id,
        models.Account.user_id == user_id,
    ).with_for_update().first()


def _assert_category_owned(db: Session, category_id: Optional[str], user_id: str) -> None:
    """Verifica que la categoría pertenezca al usuario (o sea default sin dueño).

    Evita un IDOR parcial: apuntar la propia transacción a la category_id de otro
    usuario filtraría el nombre de esa categoría al serializar la transacción.
    """
    if category_id is None:
        return
    cat = db.query(models.Category).filter(models.Category.id == category_id).first()
    if not cat or (cat.user_id and cat.user_id != user_id):
        raise HTTPException(status_code=404, detail="Categoría no encontrada")


@router.get("/")
def get_transactions(
    page: int = 1,
    limit: int = 50,
    startDate: Optional[date] = None,
    endDate: Optional[date] = None,
    type: Optional[str] = None,
    categoryId: Optional[str] = None,
    search: Optional[str] = None,
    sortBy: Optional[str] = "transaction_date",
    sortDir: Optional[str] = "desc",
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

    # Orden dinámico con whitelist. id como desempate => paginación determinística.
    sort_col = ALLOWED_SORT_COLUMNS.get(sortBy or "transaction_date", models.Transaction.transaction_date)
    primary = sort_col.asc() if (sortDir or "desc").lower() == "asc" else sort_col.desc()

    transactions = query.options(
        joinedload(models.Transaction.category),
        joinedload(models.Transaction.account)
    ).order_by(primary, models.Transaction.id.desc()).offset((page-1)*limit).limit(limit).all()

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

    # Validar ownership de la categoría (evita IDOR parcial cross-user).
    _assert_category_owned(db, tx_in.category_id, current_user.id)

    # Envelopes (#60): rechazar si el sobre del mes está vacío.
    ok, env_status, reason = can_charge_to_envelope(
        db, current_user, tx_in.category_id, Decimal(str(tx_in.amount)), tx_in.transaction_date,
    )
    if not ok:
        raise HTTPException(
            status_code=409,
            detail={
                "code": "envelope_empty",
                "message": reason,
                "remaining": float(env_status.remaining) if env_status else None,
                "budget": float(env_status.budget) if env_status else None,
            },
        )

    new_tx = models.Transaction(**tx_in.model_dump())
    db.add(new_tx)
    db.flush()  # asegurar que new_tx.account esté disponible para el hook.

    # Convención: gasto = negativo, ingreso = positivo. La suma respeta el signo.
    account.balance = (account.balance or Decimal("0")) + Decimal(str(tx_in.amount))

    # Auto-depósito en metas (#56) — solo se dispara para ingresos.
    affected_goals = apply_auto_deposit_rules(db, new_tx)

    db.commit()
    db.refresh(new_tx)
    posthog_client.capture(
        current_user.id,
        "transaction_created",
        {"amount": float(tx_in.amount), "account_id": tx_in.account_id}
    )
    for goal in affected_goals:
        posthog_client.capture(
            current_user.id,
            "goal_auto_deposit_applied",
            {"goal_id": goal.id}
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

    # Validar ownership de la nueva categoría si se está cambiando (IDOR parcial).
    if "category_id" in update_data:
        _assert_category_owned(db, update_data["category_id"], current_user.id)

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


@router.post("/auto-categorize", response_model=schemas.AutoCategorizeResponse)
def auto_categorize(
    payload: schemas.AutoCategorizeRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Devuelve sugerencias de categoría para tx en categorías default (#55)."""
    suggestions = suggest_categories_for_user(db, current_user.id, payload.transaction_ids)
    db.commit()  # persistir embeddings calculados
    return {
        "suggestions": [
            {
                "transactionId": s.transaction_id,
                "suggestedCategoryId": s.suggested_category_id,
                "suggestedCategoryName": s.suggested_category_name,
                "confidence": s.confidence,
                "sampleDescription": s.sample_description,
            }
            for s in suggestions
        ]
    }


@router.post("/accept-categorizations", response_model=schemas.AcceptCategorySuggestionsResponse)
def accept_categorizations(
    payload: schemas.AcceptCategorySuggestionsRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Aplica las categorías aceptadas por el user. Verifica ownership de cada tx."""
    if not payload.items:
        return {"updated": 0}
    tx_ids = [it.transaction_id for it in payload.items]
    txs = (
        db.query(models.Transaction)
        .join(models.Account)
        .filter(models.Transaction.id.in_(tx_ids), models.Account.user_id == current_user.id)
        .all()
    )
    by_id = {t.id: t for t in txs}
    updated = 0
    for item in payload.items:
        tx = by_id.get(item.transaction_id)
        if not tx:
            continue
        # Validar que la categoría pertenezca al user (o sea default).
        cat = db.query(models.Category).filter(models.Category.id == item.category_id).first()
        if not cat or (cat.user_id and cat.user_id != current_user.id):
            continue
        tx.category_id = item.category_id
        updated += 1
    db.commit()
    return {"updated": updated}


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
