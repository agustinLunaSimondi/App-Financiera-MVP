"""
Servicio de sincronización con Mercado Pago.
Maneja el intercambio OAuth, refresh de tokens y sincronización de pagos.
"""
import httpx
import os
import logging
from datetime import datetime, timedelta, timezone, date
from decimal import Decimal
from typing import Optional
from sqlalchemy.orm import Session

from app.database import models

logger = logging.getLogger(__name__)

MP_API_BASE = "https://api.mercadopago.com"
MP_OAUTH_URL = f"{MP_API_BASE}/oauth/token"


def get_mp_config():
    """Obtener configuración de Mercado Pago desde variables de entorno."""
    client_id = os.getenv("MP_CLIENT_ID")
    client_secret = os.getenv("MP_CLIENT_SECRET")
    redirect_uri = os.getenv("MP_REDIRECT_URI", "http://localhost:5173/integrations/mercadopago/callback")
    
    if not client_id or not client_secret:
        raise ValueError("MP_CLIENT_ID y MP_CLIENT_SECRET deben estar configurados en .env")
    
    return {
        "client_id": client_id,
        "client_secret": client_secret,
        "redirect_uri": redirect_uri,
    }


def get_auth_url() -> str:
    """Genera la URL de autorización OAuth de Mercado Pago."""
    config = get_mp_config()
    return (
        f"https://auth.mercadopago.com.ar/authorization"
        f"?client_id={config['client_id']}"
        f"&response_type=code"
        f"&platform_id=mp"
        f"&redirect_uri={config['redirect_uri']}"
    )


async def exchange_code_for_tokens(code: str) -> dict:
    """Intercambia el código de autorización por tokens de acceso."""
    config = get_mp_config()
    
    async with httpx.AsyncClient() as client:
        response = await client.post(MP_OAUTH_URL, json={
            "client_id": config["client_id"],
            "client_secret": config["client_secret"],
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": config["redirect_uri"],
        })
        
        if response.status_code != 200:
            logger.error(f"Error intercambiando código OAuth: {response.status_code} - {response.text}")
            raise ValueError(f"Error de Mercado Pago: {response.json().get('message', 'Error desconocido')}")
        
        data = response.json()
        return {
            "access_token": data["access_token"],
            "refresh_token": data["refresh_token"],
            "user_id": str(data.get("user_id", "")),
            "expires_in": data.get("expires_in", 15552000),  # 180 days default
        }


async def refresh_access_token(connection: models.MercadoPagoConnection) -> dict:
    """Renueva el access token usando el refresh token."""
    config = get_mp_config()
    
    async with httpx.AsyncClient() as client:
        response = await client.post(MP_OAUTH_URL, json={
            "client_id": config["client_id"],
            "client_secret": config["client_secret"],
            "grant_type": "refresh_token",
            "refresh_token": connection.refresh_token,
        })
        
        if response.status_code != 200:
            logger.error(f"Error renovando token: {response.status_code} - {response.text}")
            raise ValueError("No se pudo renovar el token de MP. Reconectá tu cuenta.")
        
        data = response.json()
        return {
            "access_token": data["access_token"],
            "refresh_token": data["refresh_token"],
            "expires_in": data.get("expires_in", 15552000),
        }


async def fetch_payments(access_token: str, since: Optional[datetime] = None) -> list:
    """
    Obtiene pagos de la API de Mercado Pago.
    Si since está definido, busca pagos desde esa fecha.
    """
    params = {
        "sort": "date_created",
        "criteria": "desc",
        "limit": 100,
    }
    
    if since:
        params["begin_date"] = since.strftime("%Y-%m-%dT00:00:00.000-03:00")
        params["end_date"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT23:59:59.999-03:00")
        params["range"] = "date_created"
    
    all_payments = []
    offset = 0
    
    async with httpx.AsyncClient() as client:
        while True:
            params["offset"] = offset
            response = await client.get(
                f"{MP_API_BASE}/v1/payments/search",
                params=params,
                headers={"Authorization": f"Bearer {access_token}"}
            )
            
            if response.status_code == 401:
                raise ValueError("TOKEN_EXPIRED")
            
            if response.status_code != 200:
                logger.error(f"Error obteniendo pagos: {response.status_code} - {response.text}")
                break
            
            data = response.json()
            results = data.get("results", [])
            all_payments.extend(results)
            
            paging = data.get("paging", {})
            total = paging.get("total", 0)
            
            offset += len(results)
            if offset >= total or len(results) == 0:
                break
    
    return all_payments


def sync_payments_to_transactions(
    db: Session,
    user: models.User,
    payments: list,
    default_account_id: str,
    default_category_id: str,
) -> dict:
    """
    Convierte pagos de MP en transacciones locales.
    Evita duplicados comprobando external_id.
    """
    imported = 0
    skipped = 0
    
    for payment in payments:
        mp_payment_id = str(payment.get("id", ""))
        status = payment.get("status", "")
        
        # Solo importar pagos aprobados
        if status != "approved":
            skipped += 1
            continue
        
        # Verificar duplicado
        existing = db.query(models.Transaction).filter(
            models.Transaction.external_id == f"mp_{mp_payment_id}",
            models.Transaction.account_id == default_account_id,
        ).first()
        
        if existing:
            skipped += 1
            continue
        
        # Determinar monto y descripción
        amount = Decimal(str(payment.get("transaction_amount", 0)))
        operation_type = payment.get("operation_type", "")
        description_parts = []
        
        # Determinar el signo del monto
        if operation_type in ("regular_payment", "payment"):
            # Pago que hizo el usuario → gasto
            amount = -abs(amount)
            description_parts.append("[MP Pago]")
        else:
            # Cobro recibido → ingreso
            amount = abs(amount)
            description_parts.append("[MP Cobro]")
        
        # Construir descripción
        mp_description = payment.get("description", "")
        payer_email = payment.get("payer", {}).get("email", "")
        
        if mp_description:
            description_parts.append(mp_description)
        elif payer_email:
            description_parts.append(f"De: {payer_email}")
        else:
            description_parts.append(f"Operación #{mp_payment_id}")
        
        description = " ".join(description_parts)
        
        # Obtener fecha
        date_str = payment.get("date_approved") or payment.get("date_created", "")
        try:
            tx_date = datetime.fromisoformat(date_str.replace("Z", "+00:00")).date()
        except (ValueError, AttributeError):
            tx_date = date.today()
        
        # Crear transacción
        new_tx = models.Transaction(
            account_id=default_account_id,
            category_id=default_category_id,
            amount=amount,
            description=description,
            transaction_date=tx_date,
            external_id=f"mp_{mp_payment_id}",
            source="mercadopago",
        )
        db.add(new_tx)
        imported += 1
    
    if imported > 0:
        db.commit()
    
    return {
        "transactions_imported": imported,
        "transactions_skipped": skipped,
        "message": f"Se importaron {imported} transacciones, {skipped} omitidas.",
    }
