"""
Endpoints de integración con Mercado Pago.
OAuth flow + sincronización de pagos.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
import logging

from app.database import models
from app.database.database import get_db
from app.core.deps import get_current_user
from app import schemas
from app.modules.mercadopago import mp_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/mercadopago", tags=["mercadopago"])


@router.get("/auth-url")
def get_auth_url(current_user: models.User = Depends(get_current_user)):
    """Devuelve la URL de autorización OAuth de Mercado Pago."""
    try:
        url = mp_service.get_auth_url()
        return {"authUrl": url}
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/callback", response_model=schemas.MercadoPagoStatus)
async def handle_callback(
    callback_data: schemas.MercadoPagoCallback,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Intercambia el código OAuth por tokens y guarda la conexión."""
    try:
        tokens = await mp_service.exchange_code_for_tokens(callback_data.code)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    # Calcular expiración
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=tokens["expires_in"])
    
    # Buscar conexión existente o crear nueva
    connection = db.query(models.MercadoPagoConnection).filter(
        models.MercadoPagoConnection.user_id == current_user.id
    ).first()
    
    if connection:
        connection.access_token = tokens["access_token"]
        connection.refresh_token = tokens["refresh_token"]
        connection.mp_user_id = tokens["user_id"]
        connection.expires_at = expires_at
    else:
        connection = models.MercadoPagoConnection(
            user_id=current_user.id,
            access_token=tokens["access_token"],
            refresh_token=tokens["refresh_token"],
            mp_user_id=tokens["user_id"],
            expires_at=expires_at,
        )
        db.add(connection)
    
    db.commit()
    db.refresh(connection)
    
    logger.info(f"Mercado Pago conectado para usuario {current_user.id}")
    
    return schemas.MercadoPagoStatus(
        connected=True,
        mp_user_id=connection.mp_user_id,
        last_sync_at=connection.last_sync_at,
        expires_at=connection.expires_at,
    )


@router.get("/status", response_model=schemas.MercadoPagoStatus)
def get_status(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Devuelve el estado de la conexión con Mercado Pago."""
    connection = db.query(models.MercadoPagoConnection).filter(
        models.MercadoPagoConnection.user_id == current_user.id
    ).first()
    
    if not connection:
        return schemas.MercadoPagoStatus(connected=False)
    
    return schemas.MercadoPagoStatus(
        connected=True,
        mp_user_id=connection.mp_user_id,
        last_sync_at=connection.last_sync_at,
        expires_at=connection.expires_at,
    )


@router.post("/sync", response_model=schemas.MercadoPagoSyncResult)
async def sync_transactions(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Sincroniza pagos de Mercado Pago como transacciones locales."""
    connection = db.query(models.MercadoPagoConnection).filter(
        models.MercadoPagoConnection.user_id == current_user.id
    ).first()
    
    if not connection:
        raise HTTPException(status_code=404, detail="No hay conexión con Mercado Pago")
    
    # Verificar si el token está vencido y renovar
    if connection.expires_at and connection.expires_at < datetime.now(timezone.utc):
        try:
            new_tokens = await mp_service.refresh_access_token(connection)
            connection.access_token = new_tokens["access_token"]
            connection.refresh_token = new_tokens["refresh_token"]
            connection.expires_at = datetime.now(timezone.utc) + timedelta(seconds=new_tokens["expires_in"])
            db.commit()
        except ValueError:
            raise HTTPException(
                status_code=401,
                detail="Token expirado. Reconectá tu cuenta de Mercado Pago."
            )
    
    # Determinar desde cuándo buscar
    since = connection.last_sync_at
    if not since:
        # Primera vez: últimos 90 días
        since = datetime.now(timezone.utc) - timedelta(days=90)
    
    # Obtener pagos de MP
    try:
        payments = await mp_service.fetch_payments(connection.access_token, since)
    except ValueError as e:
        if str(e) == "TOKEN_EXPIRED":
            # Intentar refresh
            try:
                new_tokens = await mp_service.refresh_access_token(connection)
                connection.access_token = new_tokens["access_token"]
                connection.refresh_token = new_tokens["refresh_token"]
                connection.expires_at = datetime.now(timezone.utc) + timedelta(seconds=new_tokens["expires_in"])
                db.commit()
                payments = await mp_service.fetch_payments(connection.access_token, since)
            except ValueError:
                raise HTTPException(status_code=401, detail="Token expirado. Reconectá tu cuenta.")
        else:
            raise HTTPException(status_code=500, detail=str(e))
    
    # Necesitamos una cuenta y categoría por defecto
    default_account = db.query(models.Account).filter(
        models.Account.user_id == current_user.id
    ).first()
    
    if not default_account:
        raise HTTPException(
            status_code=400,
            detail="Necesitás al menos una cuenta para importar transacciones."
        )
    
    # Buscar o crear categoría "Mercado Pago"
    mp_category = db.query(models.Category).filter(
        models.Category.user_id == current_user.id,
        models.Category.name == "Mercado Pago",
    ).first()
    
    if not mp_category:
        mp_category = models.Category(
            user_id=current_user.id,
            name="Mercado Pago",
            color="#00AAFF",
            icon="credit-card",
            type=models.CategoryType.EXPENSE,
            is_default=False,
        )
        db.add(mp_category)
        db.commit()
        db.refresh(mp_category)
    
    # Sincronizar
    result = mp_service.sync_payments_to_transactions(
        db=db,
        user=current_user,
        payments=payments,
        default_account_id=default_account.id,
        default_category_id=mp_category.id,
    )
    
    # Actualizar última sincronización
    connection.last_sync_at = datetime.now(timezone.utc)
    db.commit()
    
    return schemas.MercadoPagoSyncResult(**result)


@router.delete("/disconnect")
def disconnect(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Desconecta la cuenta de Mercado Pago."""
    connection = db.query(models.MercadoPagoConnection).filter(
        models.MercadoPagoConnection.user_id == current_user.id
    ).first()
    
    if not connection:
        raise HTTPException(status_code=404, detail="No hay conexión activa")
    
    db.delete(connection)
    db.commit()
    
    logger.info(f"Mercado Pago desconectado para usuario {current_user.id}")
    return {"message": "Cuenta de Mercado Pago desconectada"}
