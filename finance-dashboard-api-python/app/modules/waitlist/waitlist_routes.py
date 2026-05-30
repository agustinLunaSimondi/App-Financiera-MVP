"""
Endpoint público para capturar emails de la landing page (waitlist).
No requiere autenticación.
"""
from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from pydantic import BaseModel, EmailStr
from typing import Optional
import logging

from app.database import models
from app.database.database import get_db
from app.core.rate_limit import limiter

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/waitlist", tags=["waitlist"])


class WaitlistSignup(BaseModel):
    email: EmailStr
    source: Optional[str] = None


class WaitlistResponse(BaseModel):
    success: bool
    message: str
    already_registered: bool = False


@router.post("", response_model=WaitlistResponse)
@limiter.limit("10/minute")
def join_waitlist(
    request: Request,
    payload: WaitlistSignup,
    db: Session = Depends(get_db),
):
    """Agrega un email a la lista de espera. Idempotente."""
    email_clean = payload.email.lower().strip()
    referrer = request.headers.get("referer")

    existing = db.query(models.WaitlistEmail).filter(
        models.WaitlistEmail.email == email_clean
    ).first()

    if existing:
        return WaitlistResponse(
            success=True,
            message="Ya estás en la lista. Te avisamos apenas tengamos novedades.",
            already_registered=True,
        )

    try:
        entry = models.WaitlistEmail(
            email=email_clean,
            source=payload.source,
            referrer=referrer,
        )
        db.add(entry)
        db.commit()
        logger.info(f"Waitlist signup: {email_clean} (source={payload.source})")
    except IntegrityError:
        db.rollback()
        return WaitlistResponse(
            success=True,
            message="Ya estás en la lista. Te avisamos apenas tengamos novedades.",
            already_registered=True,
        )

    return WaitlistResponse(
        success=True,
        message="¡Listo! Te vamos a avisar apenas tengamos novedades.",
        already_registered=False,
    )


@router.get("/count")
def get_waitlist_count(db: Session = Depends(get_db)):
    """Devuelve el número total de emails en la waitlist (para mostrar social proof)."""
    count = db.query(models.WaitlistEmail).count()
    return {"count": count}
