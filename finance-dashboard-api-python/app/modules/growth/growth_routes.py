"""Endpoints del growth layer: referidos, entitlements y validación de precio."""
# Ojo: nada de `from __future__ import annotations` acá. Las rutas envueltas por
# @limiter.limit exponen los __globals__ de slowapi, y con las anotaciones
# diferidas FastAPI no puede resolver los modelos Pydantic del request.
import logging
from decimal import Decimal
from typing import Dict, Optional

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.core.rate_limit import limiter
from app.database import models
from app.database.database import get_db

from .entitlements import entitlements_for
from .logic import REWARD_TIERS, ReferralLite, earned_reward_months, next_reward_tier, qualified_count
from .processor import ensure_referral_code

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/growth", tags=["growth"])

# Acciones válidas sobre la pricing page. Lista cerrada para que el endpoint público
# no se convierta en un buzón de texto libre.
_VALID_INTENT_ACTIONS = frozenset({
    "viewed_pricing",
    "clicked_subscribe",
    "joined_waitlist",
    "rejected_price",
})

_MAX_FEEDBACK_LEN = 1000


class PricingIntentPayload(BaseModel):
    action: str
    plan: str = "premium"
    email: Optional[EmailStr] = None
    priceShownArs: Optional[Decimal] = Field(default=None, ge=0, le=Decimal("99999999"))
    priceShownUsd: Optional[Decimal] = Field(default=None, ge=0, le=Decimal("99999999"))
    feedback: Optional[str] = Field(default=None, max_length=_MAX_FEEDBACK_LEN)


class PricingIntentResponse(BaseModel):
    success: bool
    message: str


@router.get("/me")
def get_my_growth_state(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Estado de referidos + entitlements del usuario. Genera el código si no existía."""
    code = ensure_referral_code(db, current_user)
    db.commit()

    rows = (
        db.query(models.Referral.status)
        .filter(models.Referral.referrer_user_id == current_user.id)
        .all()
    )
    referrals = [ReferralLite(status=r[0]) for r in rows]
    qualified = qualified_count(referrals)

    return {
        "referralCode": code,
        "referrals": {
            "total": len(referrals),
            "qualified": qualified,
            "pending": len(referrals) - qualified,
        },
        "rewards": {
            "earnedMonths": earned_reward_months(qualified),
            "nextTier": next_reward_tier(qualified),
            "tiers": list(REWARD_TIERS),
        },
        "entitlements": entitlements_for(current_user),
    }


@router.get("/entitlements")
def get_entitlements(current_user: models.User = Depends(get_current_user)):
    """Permisos del usuario según su plan. La UI lo usa para decidir qué bloquear."""
    return entitlements_for(current_user)


@router.post("/pricing-intent", response_model=PricingIntentResponse)
@limiter.limit("20/minute")
def record_pricing_intent(
    request: Request,
    payload: PricingIntentPayload,
    db: Session = Depends(get_db),
):
    """Registra una señal de willingness-to-pay desde la pricing page.

    Endpoint público: la pricing page se ve sin estar logueado y ahí es justamente
    donde más importa medir. Si hay sesión, el frontend manda el email.
    """
    if payload.action not in _VALID_INTENT_ACTIONS:
        # No es un 400: un cliente viejo mandando una acción desconocida no debería
        # romper la UI del usuario. Lo descartamos y lo dejamos en el log.
        logger.warning("Pricing intent con acción desconocida: %s", payload.action)
        return PricingIntentResponse(success=False, message="Acción no reconocida.")

    intent = models.PricingIntent(
        user_id=None,
        email=payload.email.lower().strip() if payload.email else None,
        plan=payload.plan,
        price_shown_ars=payload.priceShownArs,
        price_shown_usd=payload.priceShownUsd,
        action=payload.action,
        feedback=payload.feedback.strip() if payload.feedback else None,
    )
    db.add(intent)
    db.commit()

    logger.info(
        "Pricing intent: action=%s plan=%s ars=%s usd=%s",
        payload.action, payload.plan, payload.priceShownArs, payload.priceShownUsd,
    )
    return PricingIntentResponse(success=True, message="Gracias por tu respuesta.")


@router.get("/pricing-intent/stats")
def pricing_intent_stats(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Conteo de intenciones por acción — para leer la validación de precio.

    Requiere sesión. Devuelve solo agregados, nunca filas individuales con email.
    """
    rows = (
        db.query(models.PricingIntent.action, models.PricingIntent.plan)
        .all()
    )
    by_action: Dict[str, int] = {}
    for action, _plan in rows:
        by_action[action] = by_action.get(action, 0) + 1

    viewed = by_action.get("viewed_pricing", 0)
    clicked = by_action.get("clicked_subscribe", 0)
    return {
        "byAction": by_action,
        "total": len(rows),
        # Tasa de conversión de la pricing page: la métrica que decide si el precio va.
        "clickThroughRate": round(clicked / viewed, 4) if viewed else None,
    }
