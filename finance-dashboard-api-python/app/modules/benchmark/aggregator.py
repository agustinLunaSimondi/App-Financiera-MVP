"""
Agregador diario para benchmark anonimizado (#59).

Construye buckets (age_range, geo_region, category_name, period='monthly') con
gasto mensual del último mes completo de cada usuario opt-in. Publica el bucket
sólo si `sample_size >= MIN_BUCKET_SIZE` para preservar el k-anonymity.
"""
from __future__ import annotations

import logging
from collections import defaultdict
from datetime import date, timedelta
from decimal import Decimal
from statistics import mean

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import models
from app.database.database import SessionLocal

logger = logging.getLogger(__name__)

MIN_BUCKET_SIZE = 50
BENCHMARK_LOCK_KEY = 859203745
VALID_AGE_RANGES = {"18-24", "25-34", "35-44", "45-54", "55+"}
VALID_GEO = {"AR-CABA", "AR-GBA", "AR-Norte", "AR-Cuyo", "AR-Sur", "AR-Centro", "Otro"}


def _percentile(values: list[Decimal], p: float) -> Decimal:
    if not values:
        return Decimal("0")
    s = sorted(values)
    k = (len(s) - 1) * p
    f = int(k)
    c = min(f + 1, len(s) - 1)
    if f == c:
        return s[f]
    return s[f] + (s[c] - s[f]) * Decimal(str(k - f))


def compute_buckets(month_spend_by_user: dict[str, dict[str, Decimal]], user_demo: dict[str, tuple[str, str]]) -> list[dict]:
    """
    Pure function — testeable.

    Args:
      month_spend_by_user: {user_id: {category_name: total_spent_positive_decimal}}
      user_demo: {user_id: (age_range, geo_region)}

    Returns: lista de buckets aptos para publicar (>= MIN_BUCKET_SIZE).
    """
    buckets: dict[tuple[str, str, str], list[Decimal]] = defaultdict(list)
    for user_id, cats in month_spend_by_user.items():
        if user_id not in user_demo:
            continue
        age, geo = user_demo[user_id]
        if age not in VALID_AGE_RANGES or geo not in VALID_GEO:
            continue
        for cat, amount in cats.items():
            buckets[(age, geo, cat)].append(amount)

    publishable = []
    for (age, geo, cat), vals in buckets.items():
        if len(vals) < MIN_BUCKET_SIZE:
            continue
        publishable.append({
            "age_range": age,
            "geo_region": geo,
            "category_name": cat,
            "period": "monthly",
            "sample_size": len(vals),
            "p25": _percentile(vals, 0.25),
            "p50": _percentile(vals, 0.50),
            "p75": _percentile(vals, 0.75),
            "avg": Decimal(str(mean(vals))),
        })
    return publishable


def _try_lock(db: Session, key: int) -> bool:
    try:
        return bool(db.execute(text("SELECT pg_try_advisory_lock(:k)"), {"k": key}).scalar())
    except Exception:
        return True


def _release_lock(db: Session, key: int) -> None:
    try:
        db.execute(text("SELECT pg_advisory_unlock(:k)"), {"k": key})
    except Exception:
        pass


def _previous_month_window(today: date) -> tuple[date, date]:
    """Devuelve [start, end] del mes calendario anterior."""
    first_this_month = date(today.year, today.month, 1)
    last_prev_month = first_this_month - timedelta(days=1)
    first_prev_month = date(last_prev_month.year, last_prev_month.month, 1)
    return first_prev_month, last_prev_month


def run_daily_benchmark_aggregation(today: date | None = None) -> int:
    """Job que recomputa los buckets (#59). Solo considera usuarios opt-in."""
    today = today or date.today()
    db = SessionLocal()
    written = 0
    if not _try_lock(db, BENCHMARK_LOCK_KEY):
        db.close()
        return 0
    try:
        start, end = _previous_month_window(today)
        users = db.query(models.User).filter(
            models.User.benchmark_opt_in == True,  # noqa: E712
            models.User.age_range.isnot(None),
            models.User.geo_region.isnot(None),
        ).all()
        if not users:
            return 0

        user_demo: dict[str, tuple[str, str]] = {u.id: (u.age_range, u.geo_region) for u in users}
        user_ids = list(user_demo.keys())
        spend: dict[str, dict[str, Decimal]] = {uid: {} for uid in user_ids}

        txs = (
            db.query(models.Transaction, models.Account.user_id, models.Category.name)
            .join(models.Account, models.Transaction.account_id == models.Account.id)
            .join(models.Category, models.Transaction.category_id == models.Category.id)
            .filter(
                models.Account.user_id.in_(user_ids),
                models.Transaction.amount < 0,
                models.Transaction.transaction_date >= start,
                models.Transaction.transaction_date <= end,
            )
            .all()
        )
        for tx, user_id, cat_name in txs:
            spend[user_id][cat_name] = spend[user_id].get(cat_name, Decimal("0")) + abs(Decimal(str(tx.amount)))

        publishable = compute_buckets(spend, user_demo)

        # Upsert buckets (delete-and-insert para simplificar — los buckets viejos quedan obsoletos)
        db.query(models.BenchmarkAggregate).delete()
        for b in publishable:
            db.add(models.BenchmarkAggregate(**b))
            written += 1
        db.commit()
    except Exception:
        logger.exception("benchmark_aggregation failed")
        db.rollback()
    finally:
        _release_lock(db, BENCHMARK_LOCK_KEY)
        db.close()
    logger.info("benchmark_aggregation: %s buckets escritos", written)
    return written
