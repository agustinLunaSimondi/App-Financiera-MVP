"""Efectos sobre la DB del growth layer: atribución, códigos y recompensas."""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import models

from .logic import (
    REFERRED_BONUS_MONTHS,
    ReferralLite,
    can_self_refer,
    earned_reward_months,
    extract_referrer_host,
    generate_referral_code,
    normalize_landing_path,
    normalize_referral_code,
    normalize_utm,
    qualified_count,
)

logger = logging.getLogger(__name__)

# Cuántas veces reintentamos si el código generado colisiona con uno existente.
_CODE_MAX_ATTEMPTS = 5


def ensure_referral_code(db: Session, user: models.User) -> str:
    """Devuelve el código de referido del usuario, generándolo si todavía no tiene.

    No hace commit — el caller decide la transacción.
    """
    if user.referral_code:
        return user.referral_code

    for _ in range(_CODE_MAX_ATTEMPTS):
        candidate = generate_referral_code()
        exists = db.query(models.User.id).filter(models.User.referral_code == candidate).first()
        if exists:
            continue
        user.referral_code = candidate
        db.flush()
        return candidate

    # Con 31^6 combinaciones esto es prácticamente inalcanzable; si pasa, es señal
    # de un problema real (código roto, DB en mal estado) y no queremos seguir en silencio.
    raise RuntimeError("No se pudo generar un código de referido único")


def apply_attribution(
    user: models.User,
    *,
    utm_source: Optional[str] = None,
    utm_medium: Optional[str] = None,
    utm_campaign: Optional[str] = None,
    referrer: Optional[str] = None,
    landing_path: Optional[str] = None,
) -> None:
    """Escribe la atribución en el usuario. Solo first-touch: no pisa lo ya guardado.

    First-touch y no last-touch porque lo que queremos medir es qué canal *trajo*
    al usuario, que es lo que define el CAC por canal.
    """
    if user.acquisition_source is None:
        user.acquisition_source = normalize_utm(utm_source)
    if user.acquisition_medium is None:
        user.acquisition_medium = normalize_utm(utm_medium)
    if user.acquisition_campaign is None:
        user.acquisition_campaign = normalize_utm(utm_campaign)
    if user.acquisition_referrer is None:
        user.acquisition_referrer = extract_referrer_host(referrer)
    if user.acquisition_landing is None:
        user.acquisition_landing = normalize_landing_path(landing_path)


def grant_premium_months(user: models.User, months: int) -> None:
    """Extiende el premium del usuario `months` meses.

    Si ya tiene premium vigente, suma desde su vencimiento; si no, desde hoy.
    Así nadie pierde tiempo pago por acumular recompensas.
    """
    if months <= 0:
        return
    now = datetime.now(timezone.utc)
    base = now
    if user.plan_expires_at is not None:
        current = user.plan_expires_at
        if current.tzinfo is None:
            current = current.replace(tzinfo=timezone.utc)
        if current > now:
            base = current
    user.plan_type = "premium"
    user.plan_expires_at = base + timedelta(days=30 * months)


def attach_referral(
    db: Session,
    *,
    referred_user: models.User,
    raw_code: Optional[str],
) -> Optional[models.Referral]:
    """Vincula al usuario recién registrado con quien lo invitó.

    Devuelve el Referral creado, o None si el código es inválido/inexistente/propio.
    Un código malo nunca hace fallar el registro: es una mejora, no un requisito.
    """
    code = normalize_referral_code(raw_code)
    if not code:
        return None

    referrer = db.query(models.User).filter(models.User.referral_code == code).first()
    if referrer is None:
        logger.info("Referral code no encontrado: %s", code)
        return None

    if not can_self_refer(referrer.id, referred_user.id):
        return None

    referral = models.Referral(
        referrer_user_id=referrer.id,
        referred_user_id=referred_user.id,
        code_used=code,
        status="pending",
    )
    db.add(referral)
    referred_user.referred_by_user_id = referrer.id
    # El invitado recibe su bonus al instante: es lo que hace que el link valga la pena
    # compartirlo. La recompensa del que invita se difiere hasta que el invitado activa.
    grant_premium_months(referred_user, REFERRED_BONUS_MONTHS)

    try:
        db.flush()
    except IntegrityError:
        # El usuario ya venía referido por otro (constraint uq_referral_referred_user).
        db.rollback()
        return None

    return referral


def qualify_referral(db: Session, user: models.User) -> Optional[models.Referral]:
    """Marca como 'qualified' el referido de este usuario y premia a quien lo invitó.

    Se llama cuando el usuario completa el onboarding. Idempotente: si ya estaba
    calificado no vuelve a premiar.
    """
    referral = (
        db.query(models.Referral)
        .filter(
            models.Referral.referred_user_id == user.id,
            models.Referral.status == "pending",
        )
        .first()
    )
    if referral is None:
        return None

    referral.status = "qualified"
    referral.qualified_at = datetime.now(timezone.utc)
    # Flush explícito: la sesión corre con autoflush=False, así que sin esto el
    # conteo de abajo leería el estado viejo ('pending') y la recompensa nunca
    # se otorgaría. No confiar en autoflush — acá el orden importa.
    db.flush()

    referrer = db.query(models.User).filter(models.User.id == referral.referrer_user_id).first()
    if referrer is not None:
        rows = (
            db.query(models.Referral.status)
            .filter(models.Referral.referrer_user_id == referrer.id)
            .all()
        )
        qualified = qualified_count([ReferralLite(status=r[0]) for r in rows])
        previous = qualified - 1
        # Solo otorgamos el delta del tier: si pasó de 1 mes ganado a 3, damos 2.
        delta = earned_reward_months(qualified) - earned_reward_months(previous)
        if delta > 0:
            grant_premium_months(referrer, delta)
            logger.info(
                "Referral reward: user=%s +%s meses (qualified=%s)",
                referrer.id, delta, qualified,
            )

    db.flush()
    return referral
