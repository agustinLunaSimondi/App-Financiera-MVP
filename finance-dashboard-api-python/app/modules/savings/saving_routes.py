from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import models
from app.database.database import get_db
from app.core.deps import get_current_user
from app import schemas

router = APIRouter(prefix="/savings-goals", tags=["savings"])

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
    for key, value in update_data.items():
        setattr(goal, key, value)
        
    db.commit()
    db.refresh(goal)
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
