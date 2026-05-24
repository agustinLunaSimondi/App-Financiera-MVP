"""
Public widgets para embeber (#64).

Endpoints autenticados:
- GET    /api/widgets               → listar mis widgets
- POST   /api/widgets               → crear (genera token único)
- DELETE /api/widgets/{id}          → eliminar
- POST   /api/widgets/{id}/rotate   → rotar token

Endpoint público (sin auth):
- GET    /api/widgets/public/{token}  → datos calculados para renderizar

El render del iframe vive en el frontend (`/widget/{token}`).
"""
from __future__ import annotations

import json
import secrets
from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Any, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.database import models
from app.database.database import get_db

router = APIRouter(prefix="/widgets", tags=["widgets"])

WidgetType = Literal["balance", "goal", "month_spend"]


class WidgetCreate(BaseModel):
    type: WidgetType
    config: Optional[dict[str, Any]] = None  # ej: {"goalId": "...", "currencySymbol": "$"}
    expiresInDays: Optional[int] = None      # None = sin expiración


def _gen_token() -> str:
    # URL-safe, 24 bytes ≈ 32 chars. Suficiente para no enumerar.
    return secrets.token_urlsafe(24)


def _serialize(w: models.PublicWidget) -> dict:
    cfg = json.loads(w.config_json) if w.config_json else {}
    return {
        "id": w.id,
        "type": w.type,
        "token": w.token,
        "config": cfg,
        "expiresAt": w.expires_at.isoformat() if w.expires_at else None,
        "createdAt": w.created_at.isoformat() if w.created_at else None,
        "embedUrl": f"/widget/{w.token}",
    }


@router.get("/")
def list_widgets(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    rows = (
        db.query(models.PublicWidget)
        .filter(models.PublicWidget.user_id == current_user.id)
        .order_by(models.PublicWidget.created_at.desc())
        .all()
    )
    return [_serialize(w) for w in rows]


@router.post("/")
def create_widget(
    payload: WidgetCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    expires_at = None
    if payload.expiresInDays and payload.expiresInDays > 0:
        expires_at = datetime.utcnow() + timedelta(days=payload.expiresInDays)

    # Validación específica por tipo
    cfg = payload.config or {}
    if payload.type == "goal":
        goal_id = cfg.get("goalId") or cfg.get("goal_id")
        if not goal_id:
            raise HTTPException(status_code=400, detail="goal widget requiere config.goalId")
        owns = db.query(models.SavingGoal).filter(
            models.SavingGoal.id == goal_id,
            models.SavingGoal.user_id == current_user.id,
        ).first()
        if not owns:
            raise HTTPException(status_code=404, detail="Meta no encontrada")
        cfg = {"goalId": goal_id, **{k: v for k, v in cfg.items() if k not in {"goalId", "goal_id"}}}

    w = models.PublicWidget(
        user_id=current_user.id,
        token=_gen_token(),
        type=payload.type,
        config_json=json.dumps(cfg) if cfg else None,
        expires_at=expires_at,
    )
    db.add(w)
    db.commit()
    db.refresh(w)
    return _serialize(w)


@router.delete("/{widget_id}")
def delete_widget(
    widget_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    w = db.query(models.PublicWidget).filter(
        models.PublicWidget.id == widget_id,
        models.PublicWidget.user_id == current_user.id,
    ).first()
    if not w:
        raise HTTPException(status_code=404, detail="Widget no encontrado")
    db.delete(w)
    db.commit()
    return {"message": "Widget eliminado"}


@router.post("/{widget_id}/rotate")
def rotate_widget_token(
    widget_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    w = db.query(models.PublicWidget).filter(
        models.PublicWidget.id == widget_id,
        models.PublicWidget.user_id == current_user.id,
    ).first()
    if not w:
        raise HTTPException(status_code=404, detail="Widget no encontrado")
    w.token = _gen_token()
    db.commit()
    db.refresh(w)
    return _serialize(w)


# ── Endpoint público ─────────────────────────────────────────────
@router.get("/public/{token}")
def get_public_widget(
    token: str,
    db: Session = Depends(get_db),
):
    """No-auth. Resuelve token → datos minimal del widget.
    Solo expone agregados — nunca tx individuales ni datos personales."""
    w = db.query(models.PublicWidget).filter(models.PublicWidget.token == token).first()
    if not w:
        raise HTTPException(status_code=404, detail="Widget no encontrado")
    if w.expires_at and w.expires_at < datetime.utcnow():
        raise HTTPException(status_code=410, detail="Widget expirado")

    cfg = json.loads(w.config_json) if w.config_json else {}
    payload: dict[str, Any] = {"type": w.type, "config": cfg}

    if w.type == "balance":
        total = (
            db.query(models.Account)
            .filter(models.Account.user_id == w.user_id)
            .all()
        )
        balance = sum((Decimal(str(a.balance or 0)) for a in total), Decimal("0"))
        payload["data"] = {
            "totalBalance": float(balance),
            "currency": total[0].currency if total else "ARS",
            "accounts": len(total),
        }

    elif w.type == "goal":
        goal_id = cfg.get("goalId")
        g = db.query(models.SavingGoal).filter(
            models.SavingGoal.id == goal_id,
            models.SavingGoal.user_id == w.user_id,
        ).first()
        if not g:
            raise HTTPException(status_code=404, detail="Meta no encontrada")
        target = Decimal(str(g.target_amount or 0))
        current = Decimal(str(g.current_amount or 0))
        pct = float(min(Decimal("1"), current / target)) * 100 if target > 0 else 0
        payload["data"] = {
            "name": g.name,
            "current": float(current),
            "target": float(target),
            "progressPct": round(pct, 1),
            "deadline": g.deadline.isoformat() if g.deadline else None,
            "color": g.color,
        }

    elif w.type == "month_spend":
        today = date.today()
        start = date(today.year, today.month, 1)
        txs = (
            db.query(models.Transaction)
            .join(models.Account)
            .filter(
                models.Account.user_id == w.user_id,
                models.Transaction.amount < 0,
                models.Transaction.transaction_date >= start,
                models.Transaction.transaction_date <= today,
            )
            .all()
        )
        spent = sum((abs(Decimal(str(t.amount))) for t in txs), Decimal("0"))
        payload["data"] = {
            "monthLabel": today.strftime("%B %Y"),
            "spent": float(spent),
            "txCount": len(txs),
        }
    else:
        raise HTTPException(status_code=400, detail="Tipo de widget no soportado")

    return payload
