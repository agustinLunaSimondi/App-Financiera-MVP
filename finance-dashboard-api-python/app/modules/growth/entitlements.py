"""Fuente de verdad de qué puede hacer un usuario según su plan.

Todo el gating de features premium pasa por acá. La razón de centralizarlo es que
un chequeo de permisos duplicado en varios routers se desincroniza y termina
dejando abierta una feature paga sin que nadie lo note.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from fastapi import Depends, HTTPException, status

from app.core.deps import get_current_user
from app.database import models

# Features que requieren plan premium vigente.
PREMIUM_FEATURES = frozenset({
    "ai_insights",       # análisis de patrones de gasto con IA
    "unlimited_chat",    # chat AI sin tope mensual
    "advanced_reports",  # export impositivo y reportes avanzados
})

# Tope mensual de mensajes de chat en plan free.
FREE_CHAT_MONTHLY_LIMIT = 20


def is_premium(user: models.User, *, now: Optional[datetime] = None) -> bool:
    """True si el usuario tiene premium vigente.

    Un `plan_type == 'premium'` con `plan_expires_at` vencido NO es premium: el
    vencimiento manda sobre el flag, así una tarea de expiración que no corrió
    no regala acceso pago.
    """
    if user is None or user.plan_type != "premium":
        return False
    if user.plan_expires_at is None:
        # Premium sin vencimiento (ej. otorgado a mano a un beta tester).
        return True
    now = now or datetime.now(timezone.utc)
    expires = user.plan_expires_at
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    return expires > now


def has_feature(user: models.User, feature: str, *, now: Optional[datetime] = None) -> bool:
    """True si el usuario puede usar `feature`."""
    if feature not in PREMIUM_FEATURES:
        return True  # feature gratuita
    return is_premium(user, now=now)


def entitlements_for(user: models.User, *, now: Optional[datetime] = None) -> dict:
    """Payload de permisos para el frontend — evita que la UI adivine qué mostrar."""
    premium = is_premium(user, now=now)
    return {
        "planType": "premium" if premium else "free",
        "isPremium": premium,
        "planExpiresAt": user.plan_expires_at.isoformat() if user.plan_expires_at else None,
        "features": {name: (premium or name not in PREMIUM_FEATURES) for name in PREMIUM_FEATURES},
        "limits": {
            "chatMonthlyMessages": None if premium else FREE_CHAT_MONTHLY_LIMIT,
        },
    }


def require_premium(feature: str):
    """Dependencia FastAPI que corta con 402 si el usuario no tiene la feature.

    Usamos 402 Payment Required (y no 403) para que el frontend distinga
    "te falta pagar" de "no tenés permiso", y pueda abrir el paywall.
    """
    def _dep(current_user: models.User = Depends(get_current_user)) -> models.User:
        if not has_feature(current_user, feature):
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail={
                    "error": "premium_required",
                    "feature": feature,
                    "message": "Esta función es parte de Vueltito Premium.",
                },
            )
        return current_user

    return _dep
