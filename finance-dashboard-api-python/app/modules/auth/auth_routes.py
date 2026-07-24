from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
import hashlib
import logging
import os
import secrets
from pydantic import BaseModel
from app.database import models
from app.database.database import get_db
from app.core import security
from app.core.deps import get_current_user
from app.core.rate_limit import limiter
from app.core.email import send_email
from app import schemas
from app.core import posthog_client

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["auth"])

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173").split(",")[0].strip()
RESET_TOKEN_EXPIRE_MINUTES = 15


class GoogleAuthRequest(BaseModel):
    credential: str  # Google ID token (credential from google.accounts.id.initialize)


def _create_default_categories(db: Session, user_id: str):
    """Categorías argentinas por default — adaptadas al consumo real local."""
    default_categories = [
        # Ingresos
        {"name": "Sueldo", "type": models.CategoryType.INCOME, "color": "#10B981", "icon": "briefcase"},
        {"name": "Freelance", "type": models.CategoryType.INCOME, "color": "#059669", "icon": "laptop"},
        {"name": "Honorarios / Monotributo", "type": models.CategoryType.INCOME, "color": "#047857", "icon": "file-text"},
        {"name": "Inversiones (plazo fijo, MEP, FCI)", "type": models.CategoryType.INCOME, "color": "#065F46", "icon": "trending-up"},
        {"name": "Otros Ingresos", "type": models.CategoryType.INCOME, "color": "#064E3B", "icon": "plus-circle"},
        # Gastos cotidianos AR
        {"name": "Almacén / Kiosco / Supermercado", "type": models.CategoryType.EXPENSE, "color": "#F59E0B", "icon": "shopping-cart"},
        {"name": "Delivery (Rappi / PedidosYa)", "type": models.CategoryType.EXPENSE, "color": "#EF4444", "icon": "utensils"},
        {"name": "Bar / Restaurante / Salidas", "type": models.CategoryType.EXPENSE, "color": "#F97316", "icon": "coffee"},
        {"name": "SUBE / Transporte / Combustible", "type": models.CategoryType.EXPENSE, "color": "#3B82F6", "icon": "bus"},
        {"name": "Apps (Uber / Cabify / Didi)", "type": models.CategoryType.EXPENSE, "color": "#0EA5E9", "icon": "car"},
        {"name": "Alquiler / Expensas", "type": models.CategoryType.EXPENSE, "color": "#8B5CF6", "icon": "home"},
        {"name": "Servicios (luz, gas, agua, internet)", "type": models.CategoryType.EXPENSE, "color": "#EC4899", "icon": "zap"},
        {"name": "Streaming USD (Netflix, Spotify, etc.)", "type": models.CategoryType.EXPENSE, "color": "#DB2777", "icon": "tv"},
        {"name": "Impuestos / AFIP / ARCA", "type": models.CategoryType.EXPENSE, "color": "#7C3AED", "icon": "file"},
        {"name": "Salud / Obra Social / Prepaga", "type": models.CategoryType.EXPENSE, "color": "#14B8A6", "icon": "heart"},
        {"name": "Educación / Cursos", "type": models.CategoryType.EXPENSE, "color": "#6366F1", "icon": "book"},
        {"name": "Ropa / Compras", "type": models.CategoryType.EXPENSE, "color": "#A855F7", "icon": "shopping-bag"},
        {"name": "Otros Gastos", "type": models.CategoryType.EXPENSE, "color": "#6B7280", "icon": "more-horizontal"},
    ]

    for cat_data in default_categories:
        db_cat = models.Category(**cat_data, user_id=user_id, is_default=True)
        db.add(db_cat)


@router.post("/register", response_model=schemas.Token)
@limiter.limit("5/minute")
def register(request: Request, user_in: schemas.UserCreate, db: Session = Depends(get_db)):
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
    db.flush()

    default_account = models.Account(
        name="Efectivo",
        type=models.AccountType.CHECKING,
        balance=0,
        user_id=new_user.id
    )
    db.add(default_account)

    _create_default_categories(db, new_user.id)

    db.commit()
    db.refresh(new_user)

    # Sin PII hacia PostHog (mismo criterio que send_default_pii=False en Sentry):
    # distinct_id=user.id alcanza para unir eventos; email/nombre no se envían.
    posthog_client.identify(new_user.id, {"currency": new_user.currency})
    posthog_client.capture(new_user.id, "user_signed_up", {"method": "email"})

    access_token = security.create_access_token(
        data={"userId": new_user.id, "email": new_user.email}
    )
    return {"token": access_token, "user": new_user}


@router.post("/login", response_model=schemas.Token)
@limiter.limit("5/minute")
def login(request: Request, user_in: schemas.UserLogin, db: Session = Depends(get_db)):
    email_clean = user_in.email.lower()
    user = db.query(models.User).filter(models.User.email == email_clean).first()

    # Igualamos el tiempo de cómputo cuando el usuario no existe — evita enumeración por timing.
    if user:
        password_ok = security.verify_password(user_in.password, user.password_hash)
    else:
        security.verify_password(user_in.password, security.DUMMY_PASSWORD_HASH)
        password_ok = False

    if not user or not password_ok:
        logger.warning("Login fallido (credenciales inválidas)")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )

    logger.debug("Login exitoso por email")
    posthog_client.capture(user.id, "user_logged_in", {"method": "email"})
    access_token = security.create_access_token(
        data={"userId": user.id, "email": user.email}
    )
    return {"token": access_token, "user": user}


@router.post("/forgot-password")
@limiter.limit("5/minute")
def forgot_password(request: Request, payload: schemas.ForgotPasswordRequest, db: Session = Depends(get_db)):
    """
    Genera un token de reset y lo manda por email. Responde siempre el mismo
    mensaje genérico exista o no el email — evita que un atacante enumere
    cuentas registradas probando direcciones (mismo criterio que /login).
    """
    email_clean = payload.email.lower()
    user = db.query(models.User).filter(models.User.email == email_clean).first()

    if user:
        raw_token = secrets.token_urlsafe(32)
        user.reset_token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
        user.reset_token_expires_at = datetime.now(timezone.utc) + timedelta(minutes=RESET_TOKEN_EXPIRE_MINUTES)
        db.commit()

        reset_link = f"{FRONTEND_URL}/reset-password?token={raw_token}"
        send_email(
            to=user.email,
            subject="Recuperá tu contraseña de Vueltito",
            html=(
                f"<p>Pediste recuperar tu contraseña. Este link vale por {RESET_TOKEN_EXPIRE_MINUTES} minutos:</p>"
                f'<p><a href="{reset_link}">{reset_link}</a></p>'
                "<p>Si no fuiste vos, ignorá este email — tu contraseña sigue igual.</p>"
            ),
        )
        logger.info(f"Reset de contraseña solicitado user_id={user.id}")

    return {"message": "Si el email está registrado, te enviamos un link para recuperar tu contraseña."}


@router.post("/reset-password", response_model=schemas.Token)
@limiter.limit("5/minute")
def reset_password(request: Request, payload: schemas.ResetPasswordRequest, db: Session = Depends(get_db)):
    token_hash = hashlib.sha256(payload.token.encode("utf-8")).hexdigest()
    user = db.query(models.User).filter(models.User.reset_token_hash == token_hash).first()

    now = datetime.now(timezone.utc)
    if not user or not user.reset_token_expires_at or user.reset_token_expires_at < now:
        raise HTTPException(status_code=400, detail="El link de recuperación es inválido o expiró. Pedí uno nuevo.")

    user.password_hash = security.get_password_hash(payload.new_password)
    user.reset_token_hash = None
    user.reset_token_expires_at = None
    # Invalida sesiones viejas (mismo mecanismo que logout_all_sessions / cambio de password en
    # update_me). Buffer de 2s: el JWT que emitimos abajo trunca su "iat" a segundos enteros
    # (spec JWT), así que sin este margen el propio token recién emitido podía quedar con
    # iat < tokens_invalidated_at (por el redondeo) y auto-invalidarse en get_current_user.
    user.tokens_invalidated_at = now - timedelta(seconds=2)
    db.commit()
    db.refresh(user)

    posthog_client.capture(user.id, "password_reset_completed")
    logger.info(f"Contraseña reseteada user_id={user.id}")

    access_token = security.create_access_token(data={"userId": user.id, "email": user.email})
    return {"token": access_token, "user": user}


@router.post("/google", response_model=schemas.Token)
@limiter.limit("10/minute")
def google_login(request: Request, payload: GoogleAuthRequest, db: Session = Depends(get_db)):
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

    # Endurecimiento: solo aceptamos emails verificados por Google.
    # Sin esto, un atacante con un Google no verificado podría tomar el email de otro.
    if not id_info.get("email_verified"):
        logger.warning("Google login rechazado: email no verificado")
        raise HTTPException(status_code=401, detail="Tu email de Google no está verificado.")

    google_email = id_info.get("email", "").lower()
    google_name = id_info.get("name") or google_email.split("@")[0]

    if not google_email:
        raise HTTPException(status_code=400, detail="No se pudo obtener el email de Google.")

    user = db.query(models.User).filter(models.User.email == google_email).first()

    if not user:
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
        posthog_client.identify(user.id)
        posthog_client.capture(user.id, "user_signed_up", {"method": "google"})
        logger.info(f"Usuario Google registrado user_id={user.id}")
    else:
        posthog_client.capture(user.id, "user_logged_in", {"method": "google"})
        logger.info(f"Login Google exitoso user_id={user.id}")

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
    password_changed = "password" in update_data
    if password_changed:
        update_data["password_hash"] = security.get_password_hash(update_data.pop("password"))

    for key, value in update_data.items():
        setattr(current_user, key, value)

    # Cambiar la contraseña invalida todos los JWT previos (defensa contra robo de sesión)
    if password_changed:
        current_user.tokens_invalidated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/logout-all")
def logout_all_sessions(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Invalida todos los JWT emitidos hasta ahora para este usuario."""
    current_user.tokens_invalidated_at = datetime.now(timezone.utc)
    db.commit()
    posthog_client.capture(current_user.id, "user_logged_out_all_sessions")
    return {"message": "Todas las sesiones fueron cerradas. Iniciá sesión de nuevo."}


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


@router.post("/refresh", response_model=schemas.Token)
def refresh_token(
    current_user: models.User = Depends(get_current_user),
):
    """Re-emite un JWT fresco para extender la sesión sin pedir contraseña."""
    access_token = security.create_access_token(
        data={"userId": current_user.id, "email": current_user.email}
    )
    return {"token": access_token, "user": current_user}


@router.delete("/me")
def delete_my_account(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Eliminar la cuenta del usuario autenticado y todos sus datos."""
    user_id = current_user.id
    user_email = current_user.email
    posthog_client.capture(user_id, "account_deleted")
    account_ids = [acc.id for acc in current_user.accounts]
    if account_ids:
        db.query(models.Transaction).filter(
            models.Transaction.account_id.in_(account_ids)
        ).delete(synchronize_session='fetch')
    # Limpieza de waitlist — derecho al olvido (mínimo).
    db.query(models.WaitlistEmail).filter(models.WaitlistEmail.email == user_email).delete(synchronize_session='fetch')
    db.delete(current_user)
    db.commit()
    logger.info(f"Cuenta eliminada user_id={user_id}")
    return {"message": "Cuenta eliminada correctamente"}
