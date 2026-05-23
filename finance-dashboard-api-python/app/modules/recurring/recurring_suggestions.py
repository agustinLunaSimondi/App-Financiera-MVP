"""
Detección de gastos recurrentes no marcados (#61).

Agrupa transacciones por descripción normalizada y propone como sugerencia las
que tengan 3+ ocurrencias, intervalos ~30 días (±5) y montos similares (±10%).
La lógica está separada de los routes para poder testearse sin DB/HTTP.
"""
from __future__ import annotations

import re
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import date
from decimal import Decimal
from statistics import mean, median
from typing import Iterable, List, Optional

MIN_OCCURRENCES = 3
INTERVAL_TARGET_DAYS = 30
INTERVAL_TOLERANCE_DAYS = 5
AMOUNT_TOLERANCE_RATIO = Decimal("0.10")  # ±10%

_RE_NUMBERS = re.compile(r"\d+")
_RE_NON_ALNUM = re.compile(r"[^a-z0-9\s]+")
_RE_WS = re.compile(r"\s+")


def normalize_description(raw: str) -> str:
    """Lowercase, sin números ni símbolos, espacios colapsados. Sirve como clave de agrupamiento."""
    if not raw:
        return ""
    s = raw.lower().strip()
    s = _RE_NUMBERS.sub(" ", s)
    s = _RE_NON_ALNUM.sub(" ", s)
    s = _RE_WS.sub(" ", s).strip()
    return s


@dataclass
class TxLite:
    """Vista mínima de una transacción — facilita tests sin tocar el ORM."""
    id: str
    description: str
    amount: Decimal
    transaction_date: date
    category_id: Optional[str] = None
    account_id: Optional[str] = None
    recurring_id: Optional[str] = None


@dataclass
class SubscriptionSuggestion:
    key: str
    sample_description: str
    occurrences: int
    average_amount: Decimal
    median_interval_days: float
    last_transaction_date: date
    transaction_ids: List[str] = field(default_factory=list)
    category_id: Optional[str] = None
    account_id: Optional[str] = None


def _amounts_within_tolerance(amounts: List[Decimal]) -> bool:
    """True si todos los montos caen dentro de ±10% del promedio."""
    if not amounts:
        return False
    avg = sum(amounts) / Decimal(len(amounts))
    if avg == 0:
        return False
    tol = abs(avg) * AMOUNT_TOLERANCE_RATIO
    return all(abs(a - avg) <= tol for a in amounts)


def _intervals_within_tolerance(intervals: List[int]) -> bool:
    """True si la mediana de los intervalos está cerca de 30 días."""
    if not intervals:
        return False
    med = median(intervals)
    return abs(med - INTERVAL_TARGET_DAYS) <= INTERVAL_TOLERANCE_DAYS


def detect_subscriptions(transactions: Iterable[TxLite]) -> List[SubscriptionSuggestion]:
    """
    Devuelve sugerencias de suscripciones. Solo considera gastos (amount < 0) sin
    `recurring_id`. Agrupa por descripción normalizada y aplica los heurísticos
    de cantidad, intervalo y monto definidos arriba.
    """
    groups: dict[str, List[TxLite]] = defaultdict(list)
    for tx in transactions:
        if tx.recurring_id:
            continue
        if Decimal(tx.amount) >= 0:
            continue
        key = normalize_description(tx.description)
        if not key or len(key) < 3:
            continue
        groups[key].append(tx)

    suggestions: List[SubscriptionSuggestion] = []
    for key, items in groups.items():
        if len(items) < MIN_OCCURRENCES:
            continue
        items.sort(key=lambda t: t.transaction_date)
        intervals = [
            (items[i + 1].transaction_date - items[i].transaction_date).days
            for i in range(len(items) - 1)
        ]
        if not _intervals_within_tolerance(intervals):
            continue
        amounts = [Decimal(t.amount) for t in items]
        if not _amounts_within_tolerance(amounts):
            continue

        # category/account modal: el más repetido entre las ocurrencias.
        cat_counts: dict[Optional[str], int] = defaultdict(int)
        acc_counts: dict[Optional[str], int] = defaultdict(int)
        for t in items:
            cat_counts[t.category_id] += 1
            acc_counts[t.account_id] += 1
        modal_category = max(cat_counts.items(), key=lambda kv: kv[1])[0]
        modal_account = max(acc_counts.items(), key=lambda kv: kv[1])[0]

        suggestions.append(SubscriptionSuggestion(
            key=key,
            sample_description=items[-1].description,
            occurrences=len(items),
            average_amount=Decimal(str(mean(amounts))).quantize(Decimal("0.01")),
            median_interval_days=float(median(intervals)),
            last_transaction_date=items[-1].transaction_date,
            transaction_ids=[t.id for t in items],
            category_id=modal_category,
            account_id=modal_account,
        ))

    # Ordenar por monto absoluto descendente (las más caras primero).
    suggestions.sort(key=lambda s: abs(s.average_amount), reverse=True)
    return suggestions
