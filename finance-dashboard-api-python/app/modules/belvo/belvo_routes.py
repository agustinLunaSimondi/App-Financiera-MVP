"""
Endpoints de integración con Belvo.
Widget token + alta de link + sync de movimientos + webhook de actualizaciones.
"""
import hmac
import logging
import os
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.database import models
from app.database.database import get_db
from app.core.deps import get_current_user
from app.core.rate_limit import limiter
from app import schemas
from app.modules.belvo import belvo_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/belvo", tags=["belvo"])


@router.get("/widget-token", response_model=schemas.BelvoWidgetToken)
async def get_widget_token(current_user: models.User = Depends(get_current_user)):
    """Genera el access token para inicializar el Belvo Connect Widget en el frontend."""
    try:
        data = await belvo_service.get_widget_token()
        return schemas.BelvoWidgetToken(access=data["access"])
    except ValueError as e:
        logger.error(f"Error al generar widget-token de Belvo: {e}")
        raise HTTPException(status_code=500, detail="No se pudo iniciar la conexión con Belvo.")


@router.post("/link", response_model=schemas.BelvoConnectionStatus)
@limiter.limit("10/minute")
async def create_link(
    request: Request,
    link_data: schemas.BelvoLinkCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Registra el link creado por el widget y sincroniza automáticamente."""
    existing = db.query(models.BelvoConnection).filter(
        models.BelvoConnection.user_id == current_user.id,
        models.BelvoConnection.link_id == link_data.link_id,
    ).first()

    if existing:
        connection = existing
    else:
        connection = models.BelvoConnection(
            user_id=current_user.id,
            link_id=link_data.link_id,
            institution_name=link_data.institution_name,
        )
        db.add(connection)
        db.commit()
        db.refresh(connection)
        logger.info(f"Belvo conectado para usuario {current_user.id} (institución={link_data.institution_name})")

    try:
        await _sync_connection(db, current_user, connection)
    except ValueError as e:
        logger.warning(f"Sincronización inicial de Belvo falló (no es crítico): {e}")

    return schemas.BelvoConnectionStatus(
        id=connection.id,
        institution_name=connection.institution_name,
        status=connection.status,
        last_sync_at=connection.last_sync_at,
    )


@router.get("/connections", response_model=list[schemas.BelvoConnectionStatus])
def list_connections(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Lista las conexiones bancarias activas del usuario."""
    connections = db.query(models.BelvoConnection).filter(
        models.BelvoConnection.user_id == current_user.id
    ).all()

    return [
        schemas.BelvoConnectionStatus(
            id=c.id, institution_name=c.institution_name, status=c.status, last_sync_at=c.last_sync_at
        )
        for c in connections
    ]


@router.post("/connections/{connection_id}/sync", response_model=schemas.BelvoSyncResult)
@limiter.limit("10/minute")
async def sync_connection(
    connection_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Sincroniza movimientos de una conexión bancaria puntual."""
    connection = db.query(models.BelvoConnection).filter(
        models.BelvoConnection.id == connection_id,
        models.BelvoConnection.user_id == current_user.id,
    ).first()

    if not connection:
        raise HTTPException(status_code=404, detail="Conexión no encontrada")

    try:
        result = await _sync_connection(db, current_user, connection)
    except ValueError as e:
        raise HTTPException(status_code=502, detail=str(e))

    return schemas.BelvoSyncResult(**result)


@router.delete("/connections/{connection_id}")
def disconnect(
    connection_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Desconecta una cuenta bancaria/billetera conectada vía Belvo."""
    connection = db.query(models.BelvoConnection).filter(
        models.BelvoConnection.id == connection_id,
        models.BelvoConnection.user_id == current_user.id,
    ).first()

    if not connection:
        raise HTTPException(status_code=404, detail="Conexión no encontrada")

    db.delete(connection)
    db.commit()

    logger.info(f"Belvo desconectado para usuario {current_user.id} (connection_id={connection_id})")
    return {"message": "Conexión bancaria desconectada"}


@router.post("/webhook")
async def handle_webhook(request: Request, db: Session = Depends(get_db)):
    """
    Recibe notificaciones de Belvo (historical_update, new_transactions).
    No usa auth de usuario — lo llama Belvo directamente. Se valida con un
    secreto compartido configurado al registrar el webhook en el dashboard
    de Belvo (header `Belvo-Webhook-Secret`).
    """
    expected_secret = os.getenv("BELVO_WEBHOOK_SECRET")
    received_secret = request.headers.get("Belvo-Webhook-Secret", "")

    if not expected_secret or not hmac.compare_digest(received_secret, expected_secret):
        logger.warning("Webhook de Belvo rechazado: secreto inválido o no configurado.")
        raise HTTPException(status_code=401, detail="Firma de webhook inválida.")

    payload = await request.json()
    link_id = payload.get("link_id") or payload.get("link", "")
    webhook_code = payload.get("webhook_code", "")

    logger.info(f"Webhook de Belvo recibido: code={webhook_code} link={link_id[:8] if link_id else ''}...")

    connection = db.query(models.BelvoConnection).filter(
        models.BelvoConnection.link_id == link_id
    ).first()

    if not connection:
        # Puede llegar antes de que el link se haya registrado localmente; no es un error.
        return {"received": True, "processed": False}

    user = db.query(models.User).filter(models.User.id == connection.user_id).first()
    if user:
        try:
            await _sync_connection(db, user, connection)
        except ValueError as e:
            logger.warning(f"Sync disparado por webhook falló (no es crítico): {e}")

    return {"received": True, "processed": True}


async def _sync_connection(
    db: Session, user: models.User, connection: models.BelvoConnection
) -> dict:
    """Sincroniza cuentas y movimientos de una conexión Belvo puntual."""
    since = connection.last_sync_at

    accounts = await belvo_service.fetch_accounts(connection.link_id)
    accounts_by_belvo_id = {
        str(acc.get("id", "")): belvo_service.get_or_create_belvo_account(
            db, user, acc, connection.institution_name
        )
        for acc in accounts
    }

    transactions = await belvo_service.fetch_transactions(connection.link_id, since)
    categories = belvo_service.get_or_create_belvo_categories(db, user)

    result = belvo_service.sync_belvo_to_transactions(
        db=db,
        user=user,
        transactions=transactions,
        accounts_by_belvo_id=accounts_by_belvo_id,
        expense_category_id=categories["Belvo Gastos"].id,
        income_category_id=categories["Belvo Ingresos"].id,
    )

    connection.last_sync_at = datetime.now(timezone.utc)
    db.commit()

    return result
