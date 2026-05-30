"""
Endpoint público para que usuarios propongan nombres para el asistente Aki.
No requiere autenticación. Rate limit conservador para evitar spam.
"""
from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel, field_validator
import re
import logging

from app.database import models
from app.database.database import get_db
from app.core.rate_limit import limiter

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/aki-name", tags=["aki-name"])

# Blocklist básica para filtrado NSFW (español + inglés)
_BAD_WORDS = {
    "fuck", "shit", "ass", "bitch", "cunt", "cock", "dick", "pussy",
    "nigger", "nigga", "fag", "faggot", "retard", "whore", "slut",
    "puta", "puto", "mierda", "coño", "cojones", "culo", "gilipollas",
    "cabron", "cabrón", "pendejo", "verga", "polla", "chinga", "chingada",
    "pelotudo", "boludo", "concha", "hdp", "ctm", "weon", "weón",
    "marica", "maricon", "maricón", "idiota", "estupido", "estúpido",
}

_ALLOWED_RE = re.compile(r'^[\w\s.\-áéíóúüñÁÉÍÓÚÜÑ]{2,30}$')
RECENT_LIMIT = 20


def _contains_bad_word(text: str) -> bool:
    words = re.findall(r'\w+', text.lower())
    return any(w in _BAD_WORDS for w in words)


class NameSuggestionIn(BaseModel):
    name: str

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        v = v.strip()
        if not _ALLOWED_RE.match(v):
            raise ValueError("El nombre solo puede tener letras, números y espacios (2-30 caracteres).")
        if _contains_bad_word(v):
            raise ValueError("Ese nombre no cumple nuestras normas de comunidad.")
        return v


class NameSuggestionOut(BaseModel):
    success: bool
    message: str


class RecentNamesOut(BaseModel):
    names: list[dict]


@router.post("", response_model=NameSuggestionOut)
@limiter.limit("5/minute")
def submit_name(
    request: Request,
    payload: NameSuggestionIn,
    db: Session = Depends(get_db),
):
    """Guarda una propuesta de nombre para Aki. Sin autenticación requerida."""
    entry = models.AkiNameSuggestion(name=payload.name)
    db.add(entry)
    db.commit()
    logger.info(f"Aki name suggestion: {payload.name!r}")
    return NameSuggestionOut(success=True, message="¡Propuesta recibida!")


@router.get("/recent", response_model=RecentNamesOut)
def get_recent_names(db: Session = Depends(get_db)):
    """Devuelve las últimas propuestas de nombre (para mostrar actividad)."""
    rows = (
        db.query(models.AkiNameSuggestion)
        .order_by(models.AkiNameSuggestion.created_at.desc())
        .limit(RECENT_LIMIT)
        .all()
    )
    return RecentNamesOut(names=[{"name": r.name} for r in rows])
