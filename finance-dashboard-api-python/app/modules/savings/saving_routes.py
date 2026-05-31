from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from decimal import Decimal
from app.database import models
from app.database.database import get_db
from app.core.deps import get_current_user
from app import schemas
from app.core import posthog_client

router = APIRouter(prefix="/savings-goals", tags=["savings"])


def _validate_rule_fields(percentage, fixed_amount):
    """Exactamente uno de percentage/fixed_amount debe estar set, no ambos ni ninguno."""
    has_pct = percentage is not None
    has_fix = fixed_amount is not None
    if has_pct == has_fix:
        raise HTTPException(status_code=422, detail="Indicá porcentaje O monto fijo, no ambos.")
    if has_pct and not (Decimal("0") < Decimal(str(percentage)) <= Decimal("100")):
        raise HTTPException(status_code=422, detail="El porcentaje debe estar entre 0 y 100.")
    if has_fix and Decimal(str(fixed_amount)) <= 0:
        raise HTTPException(status_code=422, detail="El monto fijo debe ser positivo.")

@router.get("/", response_model=List[schemas.SavingGoal])
def get_savings(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return db.query(models.SavingGoal).filter(models.SavingGoal.user_id == current_user.id).all()

@router.post("/", response_model=schemas.SavingGoal)
def create_saving_goal(
    goal_in: schemas.SavingGoalCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    new_goal = models.SavingGoal(
        **goal_in.model_dump(),
        user_id=current_user.id
    )
    db.add(new_goal)
    db.commit()
    db.refresh(new_goal)
    posthog_client.capture(
        current_user.id,
        "saving_goal_created",
        {"target_amount": float(goal_in.target_amount), "name": goal_in.name}
    )
    return new_goal

@router.put("/{goal_id}", response_model=schemas.SavingGoal)
def update_saving_goal(
    goal_id: str,
    goal_update: schemas.SavingGoalUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    goal = db.query(models.SavingGoal).filter(
        models.SavingGoal.id == goal_id,
        models.SavingGoal.user_id == current_user.id
    ).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Meta no encontrada")
    
    update_data = goal_update.model_dump(exclude_unset=True)

    # Una meta de ahorro no puede tener saldo negativo (depósito/retiro mal calculado en el cliente).
    if "current_amount" in update_data and update_data["current_amount"] is not None:
        if Decimal(str(update_data["current_amount"])) < 0:
            raise HTTPException(status_code=422, detail="El monto ahorrado no puede ser negativo.")

    for key, value in update_data.items():
        setattr(goal, key, value)

    db.commit()
    db.refresh(goal)
    if "current_amount" in update_data:
        posthog_client.capture(
            current_user.id,
            "saving_goal_deposited",
            {"goal_id": goal_id, "current_amount": float(goal.current_amount)}
        )
    return goal

@router.delete("/{goal_id}")
def delete_saving_goal(
    goal_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    goal = db.query(models.SavingGoal).filter(
        models.SavingGoal.id == goal_id,
        models.SavingGoal.user_id == current_user.id
    ).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Meta no encontrada")
    db.delete(goal)
    db.commit()
    return {"message": "Meta eliminada"}


# ── Reglas de auto-depósito (#56) ──────────────────────────────
def _get_owned_goal(db, user_id, goal_id):
    goal = db.query(models.SavingGoal).filter(
        models.SavingGoal.id == goal_id,
        models.SavingGoal.user_id == user_id,
    ).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Meta no encontrada")
    return goal


def _get_owned_category(db, user_id, category_id):
    cat = db.query(models.Category).filter(models.Category.id == category_id).first()
    if not cat or (cat.user_id and cat.user_id != user_id):
        raise HTTPException(status_code=404, detail="Categoría no encontrada")
    return cat


@router.get("/{goal_id}/rules", response_model=List[schemas.GoalRule])
def list_goal_rules(goal_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    _get_owned_goal(db, current_user.id, goal_id)
    return db.query(models.GoalRule).filter(models.GoalRule.goal_id == goal_id).all()


@router.post("/{goal_id}/rules", response_model=schemas.GoalRule)
def create_goal_rule(
    goal_id: str,
    rule_in: schemas.GoalRuleCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    _get_owned_goal(db, current_user.id, goal_id)
    _get_owned_category(db, current_user.id, rule_in.trigger_category_id)
    _validate_rule_fields(rule_in.percentage, rule_in.fixed_amount)

    rule = models.GoalRule(
        user_id=current_user.id,
        goal_id=goal_id,
        **rule_in.model_dump(),
    )
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return rule


@router.put("/{goal_id}/rules/{rule_id}", response_model=schemas.GoalRule)
def update_goal_rule(
    goal_id: str,
    rule_id: str,
    rule_update: schemas.GoalRuleUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    rule = db.query(models.GoalRule).filter(
        models.GoalRule.id == rule_id,
        models.GoalRule.goal_id == goal_id,
        models.GoalRule.user_id == current_user.id,
    ).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Regla no encontrada")

    data = rule_update.model_dump(exclude_unset=True)
    if "trigger_category_id" in data:
        _get_owned_category(db, current_user.id, data["trigger_category_id"])
    # Si vino percentage o fixed_amount, validar el par resultante.
    if "percentage" in data or "fixed_amount" in data:
        new_pct = data.get("percentage", rule.percentage)
        new_fix = data.get("fixed_amount", rule.fixed_amount)
        # Cuando seteamos uno, blanqueamos el otro automáticamente.
        if data.get("percentage") is not None:
            new_fix = None
            data["fixed_amount"] = None
        elif data.get("fixed_amount") is not None:
            new_pct = None
            data["percentage"] = None
        _validate_rule_fields(new_pct, new_fix)

    for key, value in data.items():
        setattr(rule, key, value)
    db.commit()
    db.refresh(rule)
    return rule


@router.delete("/{goal_id}/rules/{rule_id}")
def delete_goal_rule(
    goal_id: str,
    rule_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    rule = db.query(models.GoalRule).filter(
        models.GoalRule.id == rule_id,
        models.GoalRule.goal_id == goal_id,
        models.GoalRule.user_id == current_user.id,
    ).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Regla no encontrada")
    db.delete(rule)
    db.commit()
    return {"message": "Regla eliminada"}
