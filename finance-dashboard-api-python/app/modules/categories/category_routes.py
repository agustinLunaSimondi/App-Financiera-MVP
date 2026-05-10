from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import List
from app.database import models
from app.database.database import get_db
from app.core.deps import get_current_user
from app import schemas

router = APIRouter(prefix="/categories", tags=["categories"])

@router.get("/", response_model=List[schemas.Category])
def get_categories(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return db.query(models.Category).filter(
        models.Category.user_id == current_user.id
    ).all()

@router.post("/", response_model=schemas.Category)
def create_category(
    category_in: schemas.CategoryCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    name_clean = (category_in.name or "").strip()
    if not name_clean:
        raise HTTPException(status_code=400, detail="El nombre de la categoría no puede estar vacío")

    existing = db.query(models.Category).filter(
        models.Category.user_id == current_user.id,
        models.Category.name == name_clean,
    ).first()
    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"Ya tenés una categoría llamada '{name_clean}'. Probá con otro nombre."
        )

    payload = category_in.model_dump()
    payload["name"] = name_clean
    icon = payload.get("icon")
    if isinstance(icon, str) and not icon.strip():
        payload["icon"] = None

    try:
        new_category = models.Category(
            **payload,
            user_id=current_user.id,
            is_default=False,
        )
        db.add(new_category)
        db.commit()
        db.refresh(new_category)
        return new_category
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Ya existe una categoría con ese nombre."
        )

@router.put("/{category_id}", response_model=schemas.Category)
def update_category(
    category_id: str,
    category_update: schemas.CategoryUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    category = db.query(models.Category).filter(
        models.Category.id == category_id,
        models.Category.user_id == current_user.id
    ).first()
    if not category:
        raise HTTPException(status_code=404, detail="Categoría no encontrada o no tienes permisos")
    
    update_data = category_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(category, key, value)
        
    db.commit()
    db.refresh(category)
    return category

@router.delete("/{category_id}")
def delete_category(
    category_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    category = db.query(models.Category).filter(
        models.Category.id == category_id,
        models.Category.user_id == current_user.id
    ).first()
    if not category:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")
    db.delete(category)
    db.commit()
    return {"message": "Categoría eliminada correctamente"}
