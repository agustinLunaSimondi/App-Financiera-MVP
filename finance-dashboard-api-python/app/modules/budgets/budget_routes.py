from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload
from typing import List, Literal
from app.database import models
from app.database.database import get_db
from app.core.deps import get_current_user
from app import schemas
from app.core import posthog_client
from app.modules.budgets.envelopes import envelope_status_for_category

router = APIRouter(prefix="/budgets", tags=["budgets"])


class BudgetModeUpdate(BaseModel):
    mode: Literal["standard", "envelopes"]


@router.get("/mode")
def get_budget_mode(current_user: models.User = Depends(get_current_user)):
    return {"mode": current_user.budget_mode or "standard"}


@router.put("/mode")
def update_budget_mode(
    payload: BudgetModeUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    current_user.budget_mode = payload.mode
    db.commit()
    db.refresh(current_user)
    posthog_client.capture(current_user.id, "budget_mode_changed", {"mode": payload.mode})
    return {"mode": current_user.budget_mode}


@router.get("/envelopes")
def list_envelopes(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Estado de cada sobre del mes corriente. Solo retorna budgets MONTHLY."""
    budgets = (
        db.query(models.Budget)
        .filter(
            models.Budget.user_id == current_user.id,
            models.Budget.period == models.BudgetPeriod.MONTHLY,
        )
        .options(joinedload(models.Budget.category))
        .all()
    )
    out = []
    for b in budgets:
        status = envelope_status_for_category(db, current_user.id, b.category_id)
        if status is None:
            continue
        out.append({
            "categoryId": b.category_id,
            "categoryName": b.category.name if b.category else None,
            "categoryIcon": b.category.icon if b.category else None,
            "categoryColor": b.category.color if b.category else None,
            "budget": float(status.budget),
            "spent": float(status.spent),
            "remaining": float(status.remaining),
            "isEmpty": status.remaining <= 0,
        })
    out.sort(key=lambda e: e["remaining"])  # más vacíos primero
    return {"mode": current_user.budget_mode or "standard", "envelopes": out}

@router.get("/", response_model=List[schemas.Budget])
def get_budgets(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return db.query(models.Budget).filter(
        models.Budget.user_id == current_user.id
    ).options(joinedload(models.Budget.category)).all()

@router.post("/", response_model=schemas.Budget)
def create_budget(
    budget_in: schemas.BudgetCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Verificar si ya existe un presupuesto para esta categoría y periodo
    existing = db.query(models.Budget).filter(
        models.Budget.user_id == current_user.id,
        models.Budget.category_id == budget_in.category_id,
        models.Budget.period == budget_in.period
    ).first()
    
    if existing:
        existing.amount = budget_in.amount
        existing.start_date = budget_in.start_date
        existing.is_strict = budget_in.is_strict
        db.commit()
        db.refresh(existing)
        return existing
    
    new_budget = models.Budget(
        **budget_in.model_dump(),
        user_id=current_user.id
    )
    db.add(new_budget)
    db.commit()
    db.refresh(new_budget)
    posthog_client.capture(
        current_user.id,
        "budget_created",
        {"amount": float(budget_in.amount), "period": budget_in.period}
    )
    return new_budget

@router.put("/{budget_id}", response_model=schemas.Budget)
def update_budget(
    budget_id: str,
    budget_update: schemas.BudgetUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    budget = db.query(models.Budget).filter(
        models.Budget.id == budget_id,
        models.Budget.user_id == current_user.id
    ).first()
    if not budget:
        raise HTTPException(status_code=404, detail="Presupuesto no encontrado")
    
    update_data = budget_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(budget, key, value)
        
    db.commit()
    db.refresh(budget)
    return budget

@router.delete("/{budget_id}")
def delete_budget(
    budget_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    budget = db.query(models.Budget).filter(
        models.Budget.id == budget_id,
        models.Budget.user_id == current_user.id
    ).first()
    if not budget:
        raise HTTPException(status_code=404, detail="Presupuesto no encontrado")
    db.delete(budget)
    db.commit()
    return {"message": "Presupuesto eliminado"}
