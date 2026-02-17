from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import logging
from app.database import models
from app.database.database import get_db
from app.core import security
from app.core.deps import get_current_user
from app import schemas

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["auth"])

def _create_default_categories(db: Session, user_id: str):
    default_categories = [
        # Ingresos
        {"name": "Salario", "type": models.CategoryType.INCOME, "color": "#10B981", "icon": "briefcase"},
        {"name": "Freelance", "type": models.CategoryType.INCOME, "color": "#059669", "icon": "laptop"},
        {"name": "Inversiones", "type": models.CategoryType.INCOME, "color": "#047857", "icon": "trending-up"},
        {"name": "Otros Ingresos", "type": models.CategoryType.INCOME, "color": "#065F46", "icon": "plus-circle"},
        # Gastos
        {"name": "Alimentación", "type": models.CategoryType.EXPENSE, "color": "#F59E0B", "icon": "utensils"},
        {"name": "Transporte", "type": models.CategoryType.EXPENSE, "color": "#3B82F6", "icon": "car"},
        {"name": "Vivienda", "type": models.CategoryType.EXPENSE, "color": "#8B5CF6", "icon": "home"},
        {"name": "Servicios", "type": models.CategoryType.EXPENSE, "color": "#EC4899", "icon": "zap"},
        {"name": "Entretenimiento", "type": models.CategoryType.EXPENSE, "color": "#EF4444", "icon": "film"},
        {"name": "Salud", "type": models.CategoryType.EXPENSE, "color": "#14B8A6", "icon": "heart"},
        {"name": "Educación", "type": models.CategoryType.EXPENSE, "color": "#6366F1", "icon": "book"},
        {"name": "Compras", "type": models.CategoryType.EXPENSE, "color": "#F97316", "icon": "shopping-bag"},
        {"name": "Otros Gastos", "type": models.CategoryType.EXPENSE, "color": "#6B7280", "icon": "more-horizontal"}
    ]
    
    for cat_data in default_categories:
        db_cat = models.Category(**cat_data, user_id=user_id, is_default=True)
        db.add(db_cat)

@router.post("/register", response_model=schemas.Token)
def register(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    email_clean = user_in.email.lower()
    db_user = db.query(models.User).filter(models.User.email == email_clean).first()
    if db_user:
        raise HTTPException(status_code=400, detail="El correo ya está registrado")
    
    hashed_password = security.get_password_hash(user_in.password)
    new_user = models.User(
        email=email_clean,
        password_hash=hashed_password,
        name=user_in.name,
        currency=user_in.currency,
        dark_mode=user_in.dark_mode
    )
    db.add(new_user)
    db.flush() # Para obtener el ID antes de commit si es necesario
    
    # Crear cuenta por defecto
    default_account = models.Account(
        name="Efectivo",
        type=models.AccountType.CHECKING,
        balance=0,
        user_id=new_user.id
    )
    db.add(default_account)
    
    # Crear categorías por defecto
    _create_default_categories(db, new_user.id)
    
    db.commit()
    db.refresh(new_user)
    
    access_token = security.create_access_token(
        data={"userId": new_user.id, "email": new_user.email}
    )
    return {"token": access_token, "user": new_user}

@router.post("/login", response_model=schemas.Token)
def login(user_in: schemas.UserLogin, db: Session = Depends(get_db)):
    email_clean = user_in.email.lower()
    user = db.query(models.User).filter(models.User.email == email_clean).first()
        
    if not user or not security.verify_password(user_in.password, user.password_hash):
        logger.warning(f"Login fallido para {email_clean}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    logger.info(f"Login exitoso para {email_clean}")
    access_token = security.create_access_token(
        data={"userId": user.id, "email": user.email}
    )
    return {"token": access_token, "user": user}

@router.get("/me", response_model=schemas.User)
def get_me(current_user: models.User = Depends(get_current_user)):
    return current_user

@router.put("/me", response_model=schemas.User)
def update_me(
    user_update: schemas.UserUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if user_update.email:
        existing_user = db.query(models.User).filter(models.User.email == user_update.email).first()
        if existing_user and existing_user.id != current_user.id:
            raise HTTPException(status_code=400, detail="El correo ya está en uso")
            
    update_data = user_update.model_dump(exclude_unset=True)
    if "password" in update_data:
        update_data["password_hash"] = security.get_password_hash(update_data.pop("password"))
        
    for key, value in update_data.items():
        setattr(current_user, key, value)
        
    db.commit()
    db.refresh(current_user)
    return current_user

@router.delete("/me")
def delete_my_account(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Eliminar la cuenta del usuario autenticado y todos sus datos."""
    db.delete(current_user)
    db.commit()
    return {"message": "Cuenta eliminada correctamente"}
