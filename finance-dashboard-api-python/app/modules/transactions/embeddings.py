"""
Auto-categorización por embeddings (#55).

Usa Gemini text-embedding-004 para vectorizar descripciones de TX. Similaridad
coseno contra las TX históricas categorizadas del mismo user. Cosas que mantengo
simples para MVP:
- Compute on-demand: cuando entra un TX por el endpoint, calculamos su embedding
  y los faltantes de los históricos. Guardamos en transaction_embeddings.
- Sin búsqueda vectorial nativa — N pequeño por user, cosine en Python alcanza.
"""
from __future__ import annotations

import json
import logging
import math
import os
from dataclasses import dataclass
from typing import List, Optional, Tuple

import httpx
from sqlalchemy.orm import Session

from app.database import models

logger = logging.getLogger(__name__)

GEMINI_EMBED_URL = (
    "https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent"
)
EMBEDDING_MODEL = "text-embedding-004"

# Threshold de confianza para devolver sugerencia.
HIGH_CONFIDENCE = 0.85
LOW_CONFIDENCE = 0.70


@dataclass
class CategorySuggestion:
    transaction_id: str
    suggested_category_id: str
    suggested_category_name: str
    confidence: float        # 0-1, similarity coseno con el top match
    based_on_transaction_id: str
    sample_description: str


def _api_key() -> Optional[str]:
    return (os.getenv("GEMINI_API_KEY") or "").strip() or None


def _embed_text(text: str) -> Optional[List[float]]:
    """Llama al endpoint de Gemini. None si la API key no está set o hay error."""
    key = _api_key()
    if not key:
        logger.warning("GEMINI_API_KEY no configurada — sugerencias de auto-categorización desactivadas.")
        return None
    try:
        with httpx.Client(timeout=10.0) as cli:
            res = cli.post(
                f"{GEMINI_EMBED_URL}?key={key}",
                json={
                    "model": f"models/{EMBEDDING_MODEL}",
                    "content": {"parts": [{"text": text}]},
                },
                headers={"Content-Type": "application/json"},
            )
        if res.status_code != 200:
            logger.error("Gemini embed %s → %s", res.status_code, res.text[:300])
            return None
        return res.json().get("embedding", {}).get("values")
    except Exception:
        logger.exception("embed_text fallo inesperado")
        return None


def _cosine(a: List[float], b: List[float]) -> float:
    if not a or not b or len(a) != len(b):
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(y * y for y in b))
    if na == 0 or nb == 0:
        return 0.0
    return dot / (na * nb)


def _get_or_create_embedding(db: Session, tx: models.Transaction) -> Optional[List[float]]:
    """Lee de cache (transaction_embeddings) o calcula y persiste."""
    cached = db.query(models.TransactionEmbedding).filter_by(transaction_id=tx.id).first()
    if cached:
        try:
            return json.loads(cached.embedding_json)
        except Exception:
            pass  # corrupted — recomputar.
    vec = _embed_text(tx.description or "")
    if not vec:
        return None
    if cached:
        cached.embedding_json = json.dumps(vec)
        cached.model = EMBEDDING_MODEL
    else:
        db.add(models.TransactionEmbedding(
            transaction_id=tx.id,
            embedding_json=json.dumps(vec),
            model=EMBEDDING_MODEL,
        ))
    db.flush()
    return vec


def suggest_categories_for_user(
    db: Session,
    user_id: str,
    candidate_tx_ids: Optional[List[str]] = None,
    high_threshold: float = HIGH_CONFIDENCE,
    low_threshold: float = LOW_CONFIDENCE,
) -> List[CategorySuggestion]:
    """
    Genera sugerencias para las TX especificadas (o las "candidatas" del user, ie
    las que están en una categoría default/genérica). Devuelve top-1 match con
    similaridad >= low_threshold.
    """
    # Filtro defensivo: solo TX del user.
    q = db.query(models.Transaction).join(models.Account).filter(models.Account.user_id == user_id)
    if candidate_tx_ids:
        q = q.filter(models.Transaction.id.in_(candidate_tx_ids))
    else:
        # Default: gastos en categorías default ("Otros Gastos", "Sin categoría", etc.).
        q = (
            q.join(models.Category, models.Category.id == models.Transaction.category_id)
            .filter(models.Transaction.amount < 0)
            .filter(
                (models.Category.is_default == True)  # noqa: E712
                | (models.Category.name.ilike("%otros%"))
            )
        )
    candidates = q.order_by(models.Transaction.transaction_date.desc()).limit(50).all()
    if not candidates:
        return []

    # Pool histórico: TX del user en categorías NO-default (las que el user customizó).
    historicals = (
        db.query(models.Transaction)
        .join(models.Account)
        .join(models.Category, models.Category.id == models.Transaction.category_id)
        .filter(
            models.Account.user_id == user_id,
            models.Category.is_default == False,  # noqa: E712
            models.Transaction.amount < 0,
        )
        .limit(300)
        .all()
    )
    if not historicals:
        return []

    # Precomputar embeddings de históricos (cache).
    historical_embeddings: List[Tuple[models.Transaction, List[float]]] = []
    for h in historicals:
        v = _get_or_create_embedding(db, h)
        if v:
            historical_embeddings.append((h, v))
    if not historical_embeddings:
        return []

    suggestions: List[CategorySuggestion] = []
    for c in candidates:
        cv = _get_or_create_embedding(db, c)
        if not cv:
            continue
        best: Optional[Tuple[float, models.Transaction]] = None
        for h, hv in historical_embeddings:
            if h.category_id == c.category_id:
                continue  # no sugerir la misma categoría que ya tiene
            sim = _cosine(cv, hv)
            if not best or sim > best[0]:
                best = (sim, h)
        if not best or best[0] < low_threshold:
            continue
        sim, match = best
        suggestions.append(CategorySuggestion(
            transaction_id=c.id,
            suggested_category_id=match.category_id,
            suggested_category_name=match.category.name if match.category else "",
            confidence=round(sim, 3),
            based_on_transaction_id=match.id,
            sample_description=c.description,
        ))
    # Mejor confianza primero
    suggestions.sort(key=lambda s: s.confidence, reverse=True)
    return suggestions
