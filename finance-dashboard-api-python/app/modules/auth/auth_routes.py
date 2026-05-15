from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import logging
import os
from typing import Optional
from pydantic import BaseModel
from app.database import models
from app.database.database import get_db
from app.core import security
from app.core.deps import get_current_user
from app import schemas
from app.core import posthog_client

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["auth"])

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")


class GoogleAuthRequest(BaseModel):
    credential: str  # Google ID token (credential from google.accounts.id.initialize)

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

    posthog_client.identify(new_user.id, {"email": new_user.email, "name": new_user.name, "currency": new_user.currency})
    posthog_client.capture(new_user.id, "user_signed_up", {"method": "email"})

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
    posthog_client.capture(user.id, "user_logged_in", {"method": "email"})
    access_token = security.create_access_token(
        data={"userId": user.id, "email": user.email}
    )
    return {"token": access_token, "user": user}


@router.post("/google", response_model=schemas.Token)
def google_login(payload: GoogleAuthRequest, db: Session = Depends(get_db)):
    """
    Verifica un Google ID Token emitido por el Sign-In button.
    Si el usuario no existe lo registra automáticamente.
    """
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=503,
            detail="Google Auth no está configurado en el servidor. Configurá la variable GOOGLE_CLIENT_ID."
        )
    
    try:
        from google.oauth2 import id_token
        from google.auth.transport import requests as google_requests
        id_info = id_token.verify_oauth2_token(
            payload.credential,
            google_requests.Request(),
            GOOGLE_CLIENT_ID
        )
    except ValueError as e:
        logger.warning(f"Google token inválido: {e}")
        raise HTTPException(status_code=401, detail="Token de Google inválido o expirado.")
    
    google_email = id_info.get("email", "").lower()
    google_name = id_info.get("name") or google_email.split("@")[0]

    if not google_email:
        raise HTTPException(status_code=400, detail="No se pudo obtener el email de Google.")
    
    # Buscar usuario existente
    user = db.query(models.User).filter(models.User.email == google_email).first()
    
    if not user:
        # Auto-registrar: generamos un hash inutilizable como contraseña (usuario Google-only)
        import uuid
        placeholder_hash = security.get_password_hash(f"GOOGLE_ONLY_{uuid.uuid4()}")
        user = models.User(
            email=google_email,
            password_hash=placeholder_hash,
            name=google_name,
            currency="ARS",
            dark_mode=False,
        )
        db.add(user)
        db.flush()
        
        # Cuenta por defecto
        default_account = models.Account(
            name="Efectivo",
            type=models.AccountType.CHECKING,
            balance=0,
            user_id=user.id
        )
        db.add(default_account)
        _create_default_categories(db, user.id)
        db.commit()
        db.refresh(user)
        posthog_client.identify(user.id, {"email": user.email, "name": user.name})
        posthog_client.capture(user.id, "user_signed_up", {"method": "google"})
        logger.info(f"Usuario Google registrado: {google_email}")
    else:
        posthog_client.capture(user.id, "user_logged_in", {"method": "google"})
        logger.info(f"Login Google exitoso: {google_email}")
    
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

@router.post("/onboarding-complete", response_model=schemas.User)
def complete_onboarding(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Marca el onboarding como completado para el usuario autenticado."""
    current_user.onboarding_completed = True
    db.commit()
    db.refresh(current_user)
    posthog_client.capture(current_user.id, "onboarding_completed")
    return current_user


@router.delete("/me")
def delete_my_account(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Eliminar la cuenta del usuario autenticado y todos sus datos."""
    # Delete transactions first: category_id FK has no ondelete=CASCADE,
    # so deleting categories before transactions would throw a FK violation.
    account_ids = [acc.id for acc in current_user.accounts]
    if account_ids:
        db.query(models.Transaction).filter(
            models.Transaction.account_id.in_(account_ids)
        ).delete(synchronize_session='fetch')
    db.delete(current_user)
    db.commit()
    return {"message": "Cuenta eliminada correctamente"}
