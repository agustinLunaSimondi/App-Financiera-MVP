"""Endpoints para reportes de exportación (#63 AFIP)."""
from datetime import date
from typing import List, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core import posthog_client
from app.core.deps import get_current_user
from app.database import models
from app.database.database import get_db

from .tax_report import collect_deductible_transactions, render_excel_detail, render_pdf_summary

router = APIRouter(prefix="/reports", tags=["reports"])


class TaxReportRequest(BaseModel):
    startDate: date
    endDate: date
    categoryIds: Optional[List[str]] = None
    format: Literal["pdf", "excel"] = "pdf"


def _ensure_range(start: date, end: date) -> None:
    if start > end:
        raise HTTPException(status_code=400, detail="startDate posterior a endDate")
    if (end - start).days > 366 * 2:
        raise HTTPException(status_code=400, detail="El rango máximo es 2 años")


@router.get("/deductible-categories")
def list_deductible_categories(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Lista de categorías marcadas como deducibles para usar en la UI."""
    rows = (
        db.query(models.Category)
        .filter(
            models.Category.user_id == current_user.id,
            models.Category.tax_deductible == True,  # noqa: E712
        )
        .all()
    )
    return [
        {"id": r.id, "name": r.name, "icon": r.icon, "color": r.color}
        for r in rows
    ]


@router.post("/tax-deductible")
def generate_tax_deductible_report(
    payload: TaxReportRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Genera el reporte para contador en formato PDF o Excel."""
    _ensure_range(payload.startDate, payload.endDate)
    rows = collect_deductible_transactions(
        db, current_user.id, payload.startDate, payload.endDate, payload.categoryIds
    )
    posthog_client.capture(
        current_user.id, "tax_report_generated",
        {"format": payload.format, "tx_count": len(rows)},
    )
    if payload.format == "pdf":
        pdf = render_pdf_summary(current_user.name or "Usuario", payload.startDate, payload.endDate, rows)
        filename = f"vuelto-deducibles-{payload.startDate}-{payload.endDate}.pdf"
        return Response(
            content=pdf, media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    else:
        xlsx = render_excel_detail(current_user.name or "Usuario", payload.startDate, payload.endDate, rows)
        filename = f"vuelto-deducibles-{payload.startDate}-{payload.endDate}.xlsx"
        return Response(
            content=xlsx,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
