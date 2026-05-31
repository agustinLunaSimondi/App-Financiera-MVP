"""Endpoints para benchmark anonimizado (#59)."""
from datetime import date
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.database import models
from app.database.database import get_db

from .aggregator import VALID_AGE_RANGES, VALID_GEO, _previous_month_window

router = APIRouter(prefix="/benchmark", tags=["benchmark"])


class BenchmarkPrefsUpdate(BaseModel):
    optIn: Optional[bool] = None
    ageRange: Optional[str] = None
    geoRegion: Optional[str] = None


@router.get("/prefs")
def get_benchmark_prefs(current_user: models.User = Depends(get_current_user)):
    return {
        "optIn": bool(current_user.benchmark_opt_in),
        "ageRange": current_user.age_range,
        "geoRegion": current_user.geo_region,
        "validAgeRanges": sorted(VALID_AGE_RANGES),
        "validGeoRegions": sorted(VALID_GEO),
    }


@router.put("/prefs")
def update_benchmark_prefs(
    payload: BenchmarkPrefsUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if payload.optIn is not None:
        current_user.benchmark_opt_in = payload.optIn
    if payload.ageRange is not None:
        if payload.ageRange not in VALID_AGE_RANGES:
            raise HTTPException(status_code=400, detail="ageRange inválido")
        current_user.age_range = payload.ageRange
    if payload.geoRegion is not None:
        if payload.geoRegion not in VALID_GEO:
            raise HTTPException(status_code=400, detail="geoRegion inválido")
        current_user.geo_region = payload.geoRegion

    # Si activan opt-in, requerir demo data.
    if current_user.benchmark_opt_in and (not current_user.age_range or not current_user.geo_region):
        raise HTTPException(status_code=400, detail="Para opt-in necesitás age_range y geo_region")
    db.commit()
    db.refresh(current_user)
    return {
        "optIn": bool(current_user.benchmark_opt_in),
        "ageRange": current_user.age_range,
        "geoRegion": current_user.geo_region,
    }


@router.get("/me")
def get_my_benchmark(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Devuelve la posición del usuario dentro de su bucket por categoría — solo si opt-in.
    Lista las top categorías del usuario en el mes pasado vs sus pares.
    """
    if not current_user.benchmark_opt_in:
        return {"enabled": False, "comparisons": []}
    if not current_user.age_range or not current_user.geo_region:
        return {"enabled": False, "comparisons": [], "missingDemo": True}

    start, end = _previous_month_window(date.today())

    # Gasto del user por categoría en ese mes
    txs = (
        db.query(models.Transaction, models.Category.name)
        .join(models.Account, models.Transaction.account_id == models.Account.id)
        .join(models.Category, models.Transaction.category_id == models.Category.id)
        .filter(
            models.Account.user_id == current_user.id,
            models.Transaction.amount < 0,
            models.Transaction.transaction_date >= start,
            models.Transaction.transaction_date <= end,
        )
        .all()
    )
    by_cat: dict[str, Decimal] = {}
    for tx, name in txs:
        by_cat[name] = by_cat.get(name, Decimal("0")) + abs(Decimal(str(tx.amount)))

    comparisons = []
    for cat_name, amount in sorted(by_cat.items(), key=lambda x: x[1], reverse=True):
        bucket = (
            db.query(models.BenchmarkAggregate)
            .filter(
                models.BenchmarkAggregate.age_range == current_user.age_range,
                models.BenchmarkAggregate.geo_region == current_user.geo_region,
                models.BenchmarkAggregate.category_name == cat_name,
                models.BenchmarkAggregate.period == "monthly",
            )
            .first()
        )
        if not bucket:
            continue
        median = Decimal(str(bucket.p50))
        ratio = float(amount / median) if median > 0 else None
        position = "above" if amount > Decimal(str(bucket.p75)) else (
            "below" if amount < Decimal(str(bucket.p25)) else "average"
        )
        comparisons.append({
            "category": cat_name,
            "yourSpend": float(amount),
            "p25": float(bucket.p25),
            "p50": float(bucket.p50),
            "p75": float(bucket.p75),
            "sampleSize": bucket.sample_size,
            "ratioVsMedian": ratio,
            "position": position,
        })

    return {
        "enabled": True,
        "period": f"{start.isoformat()}/{end.isoformat()}",
        "ageRange": current_user.age_range,
        "geoRegion": current_user.geo_region,
        "comparisons": comparisons[:6],
    }
