from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List
from app.database import models
from app.database.database import get_db
from app.core.deps import get_current_user
from app import schemas
from app.core import posthog_client

router = APIRouter(prefix="/budgets", tags=["budgets"])

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
