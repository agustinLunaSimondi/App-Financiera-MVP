"""Eventos — gastos compartidos en grupo (split de gastos).

Un evento agrupa miembros (registrados o externos) y gastos. Cada gasto se
divide en `splits` (partes iguales o custom). Se calculan balances por miembro
y la liquidación mínima (quién le transfiere a quién).

Receipts: se suben a Supabase Storage si SUPABASE_URL + SUPABASE_SERVICE_KEY
están configurados; si no, fallback a disco local (dev) bajo /uploads.
"""
from __future__ import annotations

import os
import uuid as uuidlib
from decimal import Decimal, ROUND_HALF_UP

import httpx
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from app.database import models
from app.database.database import get_db
from app.core.deps import get_current_user

router = APIRouter(prefix="/events", tags=["events"])

# ─── Storage de recibos ──────────────────────────────────────────────────
SUPABASE_URL = os.getenv("SUPABASE_URL", "").strip().rstrip("/")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "").strip()
RECEIPT_BUCKET = os.getenv("SUPABASE_RECEIPT_BUCKET", "event-receipts").strip()

# api root = .../finance-dashboard-api-python  (4 niveles arriba de este archivo)
_API_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
LOCAL_UPLOADS_DIR = os.path.join(_API_ROOT, "uploads", "event-receipts")

ALLOWED_RECEIPT_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"}
MAX_RECEIPT_BYTES = 5 * 1024 * 1024  # 5 MB

_CENT = Decimal("0.01")
_EPS = Decimal("0.005")


async def _store_receipt(content: bytes, filename: str, content_type: str) -> str:
    """Sube el recibo y devuelve la URL pública (Supabase) o el path local (dev)."""
    safe_name = f"{uuidlib.uuid4().hex}_{(filename or 'receipt').replace('/', '_')[:80]}"

    if SUPABASE_URL and SUPABASE_SERVICE_KEY:
        object_path = f"{RECEIPT_BUCKET}/{safe_name}"
        url = f"{SUPABASE_URL}/storage/v1/object/{object_path}"
        headers = {
            "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
            "apikey": SUPABASE_SERVICE_KEY,
            "Content-Type": content_type or "application/octet-stream",
            "x-upsert": "true",
        }
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(url, content=content, headers=headers)
        if resp.status_code not in (200, 201):
            raise HTTPException(
                status_code=502,
                detail=f"No se pudo subir el recibo al storage ({resp.status_code}).",
            )
        return f"{SUPABASE_URL}/storage/v1/object/public/{object_path}"

    # Fallback local (dev) — efímero en Render; en prod configurar Supabase Storage.
    os.makedirs(LOCAL_UPLOADS_DIR, exist_ok=True)
    with open(os.path.join(LOCAL_UPLOADS_DIR, safe_name), "wb") as fh:
        fh.write(content)
    return f"/uploads/event-receipts/{safe_name}"


# ─── Helpers ─────────────────────────────────────────────────────────────
def _display_name_for_user(user) -> str:
    return getattr(user, "name", None) or getattr(user, "email", None) or "Yo"


def _load_event(db: Session, event_id: str) -> models.Event:
    event = (
        db.query(models.Event)
        .options(
            joinedload(models.Event.members),
            joinedload(models.Event.expenses).joinedload(models.EventExpense.splits),
        )
        .filter(models.Event.id == event_id)
        .first()
    )
    if not event:
        raise HTTPException(status_code=404, detail="Evento no encontrado")
    return event


def _can_access(event: models.Event, user_id: str) -> bool:
    if event.owner_id == user_id:
        return True
    return any(m.user_id == user_id for m in event.members)


def _require_access(event: models.Event, user_id: str) -> None:
    if not _can_access(event, user_id):
        raise HTTPException(status_code=403, detail="No tenés acceso a este evento")


def _require_owner(event: models.Event, user_id: str) -> None:
    if event.owner_id != user_id:
        raise HTTPException(status_code=403, detail="Solo el organizador puede hacer esto")


def _equal_shares(amount: Decimal, member_ids: list[str]) -> dict[str, Decimal]:
    """Reparte `amount` en partes iguales. El último miembro absorbe el redondeo."""
    n = len(member_ids)
    if n == 0:
        return {}
    share = (amount / n).quantize(_CENT, rounding=ROUND_HALF_UP)
    shares = {mid: share for mid in member_ids}
    drift = amount - share * n
    shares[member_ids[-1]] = (shares[member_ids[-1]] + drift).quantize(_CENT)
    return shares


def _compute_balances(event: models.Event):
    """Devuelve (paid, owed, net) por member_id como Decimal."""
    paid = {m.id: Decimal("0") for m in event.members}
    owed = {m.id: Decimal("0") for m in event.members}
    for exp in event.expenses:
        amt = Decimal(str(exp.amount))
        paid[exp.paid_by_member_id] = paid.get(exp.paid_by_member_id, Decimal("0")) + amt
        for s in exp.splits:
            owed[s.member_id] = owed.get(s.member_id, Decimal("0")) + Decimal(str(s.share_amount))
    net = {mid: (paid.get(mid, Decimal("0")) - owed.get(mid, Decimal("0"))) for mid in paid}
    return paid, owed, net


def _compute_settlements(net: dict[str, Decimal], name_by_id: dict[str, str]) -> list[dict]:
    """Liquidación greedy: minimiza transferencias entre deudores y acreedores."""
    debtors = sorted(
        ([mid, -bal] for mid, bal in net.items() if bal < -_EPS),
        key=lambda x: x[1], reverse=True,
    )
    creditors = sorted(
        ([mid, bal] for mid, bal in net.items() if bal > _EPS),
        key=lambda x: x[1], reverse=True,
    )
    settlements: list[dict] = []
    i = j = 0
    while i < len(debtors) and j < len(creditors):
        d_id, d_amt = debtors[i]
        c_id, c_amt = creditors[j]
        pay = min(d_amt, c_amt)
        if pay > _EPS:
            settlements.append({
                "from_member_id": d_id,
                "from_member_name": name_by_id.get(d_id, "?"),
                "to_member_id": c_id,
                "to_member_name": name_by_id.get(c_id, "?"),
                "amount": pay.quantize(_CENT),
            })
        debtors[i][1] -= pay
        creditors[j][1] -= pay
        if debtors[i][1] <= _EPS:
            i += 1
        if creditors[j][1] <= _EPS:
            j += 1
    return settlements


def _serialize_expense(exp: models.EventExpense, name_by_id: dict[str, str]) -> dict:
    return {
        "id": exp.id,
        "paid_by_member_id": exp.paid_by_member_id,
        "paid_by_name": name_by_id.get(exp.paid_by_member_id, "?"),
        "description": exp.description,
        "amount": Decimal(str(exp.amount)),
        "expense_date": exp.expense_date,
        "receipt_url": exp.receipt_url,
        "receipt_filename": exp.receipt_filename,
        "split_mode": exp.split_mode,
        "splits": [
            {
                "id": s.id,
                "member_id": s.member_id,
                "member_name": name_by_id.get(s.member_id, "?"),
                "share_amount": Decimal(str(s.share_amount)),
                "is_paid": s.is_paid,
            }
            for s in exp.splits
        ],
        "created_at": exp.created_at,
    }


def _serialize_event(event: models.Event) -> dict:
    name_by_id = {m.id: m.display_name for m in event.members}
    paid, owed, net = _compute_balances(event)
    members = [
        {
            "id": m.id,
            "display_name": m.display_name,
            "email": m.email,
            "role": m.role,
            "user_id": m.user_id,
            "total_paid": paid.get(m.id, Decimal("0")).quantize(_CENT),
            "total_owed": owed.get(m.id, Decimal("0")).quantize(_CENT),
            "net_balance": net.get(m.id, Decimal("0")).quantize(_CENT),
        }
        for m in event.members
    ]
    expenses = sorted(
        (_serialize_expense(e, name_by_id) for e in event.expenses),
        key=lambda e: (str(e["expense_date"]), str(e["created_at"])),
        reverse=True,
    )
    total = sum((Decimal(str(e.amount)) for e in event.expenses), Decimal("0"))
    return {
        "id": event.id,
        "name": event.name,
        "description": event.description,
        "event_date": event.event_date,
        "currency": event.currency,
        "status": event.status,
        "cover_emoji": event.cover_emoji,
        "owner_id": event.owner_id,
        "members": members,
        "expenses": expenses,
        "settlements": _compute_settlements(net, name_by_id),
        "total_amount": total.quantize(_CENT),
        "created_at": event.created_at,
    }


# ─── Endpoints: eventos ──────────────────────────────────────────────────
from app import schemas  # noqa: E402  (import tardío para evitar ciclos)


@router.get("/", response_model=list[schemas.EventListItem])
def list_events(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    member_event_ids = db.query(models.EventMember.event_id).filter(
        models.EventMember.user_id == current_user.id
    )
    events = (
        db.query(models.Event)
        .options(joinedload(models.Event.members), joinedload(models.Event.expenses))
        .filter(or_(models.Event.owner_id == current_user.id, models.Event.id.in_(member_event_ids)))
        .order_by(models.Event.created_at.desc())
        .all()
    )
    out = []
    for ev in events:
        total = sum((Decimal(str(e.amount)) for e in ev.expenses), Decimal("0"))
        out.append({
            "id": ev.id,
            "name": ev.name,
            "description": ev.description,
            "event_date": ev.event_date,
            "currency": ev.currency,
            "status": ev.status,
            "cover_emoji": ev.cover_emoji,
            "owner_id": ev.owner_id,
            "member_count": len(ev.members),
            "total_amount": total.quantize(_CENT),
            "created_at": ev.created_at,
        })
    return out


@router.post("/", response_model=schemas.EventOut)
def create_event(
    payload: schemas.EventCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    event = models.Event(
        owner_id=current_user.id,
        name=payload.name.strip(),
        description=payload.description,
        event_date=payload.event_date,
        currency=payload.currency or "ARS",
        cover_emoji=payload.cover_emoji,
        status="ACTIVE",
    )
    db.add(event)
    db.flush()

    owner_member = models.EventMember(
        event_id=event.id,
        user_id=current_user.id,
        display_name=_display_name_for_user(current_user),
        email=getattr(current_user, "email", None),
        role="OWNER",
    )
    db.add(owner_member)
    db.commit()
    db.refresh(event)
    return _serialize_event(_load_event(db, event.id))


@router.get("/{event_id}", response_model=schemas.EventOut)
def get_event(event_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    event = _load_event(db, event_id)
    _require_access(event, current_user.id)
    return _serialize_event(event)


@router.put("/{event_id}", response_model=schemas.EventOut)
def update_event(
    event_id: str,
    payload: schemas.EventUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    event = _load_event(db, event_id)
    _require_owner(event, current_user.id)
    data = payload.model_dump(exclude_unset=True)
    for key in ("name", "description", "event_date", "cover_emoji"):
        if key in data:
            setattr(event, key, data[key])
    db.commit()
    return _serialize_event(_load_event(db, event_id))


@router.delete("/{event_id}")
def delete_event(event_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    event = _load_event(db, event_id)
    _require_owner(event, current_user.id)
    db.delete(event)
    db.commit()
    return {"message": "Evento eliminado"}


@router.post("/{event_id}/close", response_model=schemas.EventOut)
def close_event(event_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    event = _load_event(db, event_id)
    _require_owner(event, current_user.id)
    event.status = "CLOSED"
    db.commit()
    return _serialize_event(_load_event(db, event_id))


# ─── Endpoints: miembros ─────────────────────────────────────────────────
@router.post("/{event_id}/members", response_model=schemas.EventOut)
def add_member(
    event_id: str,
    payload: schemas.EventMemberCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    event = _load_event(db, event_id)
    _require_owner(event, current_user.id)
    if event.status == "CLOSED":
        raise HTTPException(status_code=409, detail="El evento está cerrado")

    email = (payload.email or "").strip().lower() or None
    display_name = (payload.display_name or "").strip()
    if not display_name and not email:
        raise HTTPException(status_code=422, detail="Indicá un nombre o un email")

    if email and any((m.email or "").lower() == email for m in event.members):
        raise HTTPException(status_code=409, detail="Ese email ya es miembro del evento")

    linked_user = None
    if email:
        linked_user = db.query(models.User).filter(models.User.email == email).first()

    member = models.EventMember(
        event_id=event.id,
        user_id=linked_user.id if linked_user else None,
        display_name=display_name or _display_name_for_user(linked_user),
        email=email,
        role="MEMBER",
    )
    db.add(member)
    db.commit()
    return _serialize_event(_load_event(db, event_id))


@router.delete("/{event_id}/members/{member_id}", response_model=schemas.EventOut)
def remove_member(
    event_id: str,
    member_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    event = _load_event(db, event_id)
    _require_owner(event, current_user.id)

    member = next((m for m in event.members if m.id == member_id), None)
    if not member:
        raise HTTPException(status_code=404, detail="Miembro no encontrado")
    if member.role == "OWNER":
        raise HTTPException(status_code=409, detail="No se puede eliminar al organizador")

    involved = any(e.paid_by_member_id == member_id for e in event.expenses) or any(
        any(s.member_id == member_id for s in e.splits) for e in event.expenses
    )
    if involved:
        raise HTTPException(
            status_code=409,
            detail="No se puede eliminar un miembro con gastos asociados",
        )

    db.delete(member)
    db.commit()
    return _serialize_event(_load_event(db, event_id))


# ─── Endpoints: gastos ───────────────────────────────────────────────────
@router.post("/{event_id}/expenses", response_model=schemas.EventOut)
def add_expense(
    event_id: str,
    payload: schemas.EventExpenseCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    event = _load_event(db, event_id)
    _require_access(event, current_user.id)
    if event.status == "CLOSED":
        raise HTTPException(status_code=409, detail="El evento está cerrado, no se pueden agregar gastos")

    member_ids = [m.id for m in event.members]
    if payload.paid_by_member_id not in member_ids:
        raise HTTPException(status_code=422, detail="El pagador no es miembro del evento")

    amount = Decimal(str(payload.amount))
    if amount <= 0:
        raise HTTPException(status_code=422, detail="El monto debe ser mayor a 0")

    expense = models.EventExpense(
        event_id=event.id,
        paid_by_member_id=payload.paid_by_member_id,
        description=payload.description.strip(),
        amount=amount,
        expense_date=payload.expense_date,
        split_mode=payload.split_mode or "equal",
    )
    db.add(expense)
    db.flush()

    if payload.split_mode == "custom" and payload.custom_splits:
        shares: dict[str, Decimal] = {}
        for item in payload.custom_splits:
            mid = item.get("memberId") or item.get("member_id")
            raw = item.get("shareAmount", item.get("share_amount", 0))
            if mid not in member_ids:
                raise HTTPException(status_code=422, detail="Split con miembro inválido")
            shares[mid] = (shares.get(mid, Decimal("0")) + Decimal(str(raw))).quantize(_CENT)
        if abs(sum(shares.values(), Decimal("0")) - amount) > _CENT:
            raise HTTPException(status_code=422, detail="Los splits no suman el total del gasto")
    else:
        shares = _equal_shares(amount, member_ids)

    for mid, share in shares.items():
        db.add(models.EventExpenseSplit(expense_id=expense.id, member_id=mid, share_amount=share))

    db.commit()
    return _serialize_event(_load_event(db, event_id))


@router.delete("/{event_id}/expenses/{expense_id}", response_model=schemas.EventOut)
def delete_expense(
    event_id: str,
    expense_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    event = _load_event(db, event_id)
    _require_access(event, current_user.id)
    expense = next((e for e in event.expenses if e.id == expense_id), None)
    if not expense:
        raise HTTPException(status_code=404, detail="Gasto no encontrado")
    db.delete(expense)
    db.commit()
    return _serialize_event(_load_event(db, event_id))


@router.post("/{event_id}/expenses/{expense_id}/receipt", response_model=schemas.EventOut)
async def upload_receipt(
    event_id: str,
    expense_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    event = _load_event(db, event_id)
    _require_access(event, current_user.id)
    expense = next((e for e in event.expenses if e.id == expense_id), None)
    if not expense:
        raise HTTPException(status_code=404, detail="Gasto no encontrado")

    if file.content_type not in ALLOWED_RECEIPT_TYPES:
        raise HTTPException(status_code=422, detail="Formato no soportado (usá imagen o PDF)")
    content = await file.read()
    if len(content) > MAX_RECEIPT_BYTES:
        raise HTTPException(status_code=413, detail="El archivo supera el límite de 5 MB")

    expense.receipt_url = await _store_receipt(content, file.filename, file.content_type)
    expense.receipt_filename = file.filename
    db.commit()
    return _serialize_event(_load_event(db, event_id))


@router.put("/{event_id}/expenses/{expense_id}/splits/{split_id}/pay", response_model=schemas.EventOut)
def mark_split_paid(
    event_id: str,
    expense_id: str,
    split_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    event = _load_event(db, event_id)
    _require_access(event, current_user.id)
    expense = next((e for e in event.expenses if e.id == expense_id), None)
    if not expense:
        raise HTTPException(status_code=404, detail="Gasto no encontrado")
    split = next((s for s in expense.splits if s.id == split_id), None)
    if not split:
        raise HTTPException(status_code=404, detail="Split no encontrado")
    split.is_paid = not split.is_paid
    db.commit()
    return _serialize_event(_load_event(db, event_id))
