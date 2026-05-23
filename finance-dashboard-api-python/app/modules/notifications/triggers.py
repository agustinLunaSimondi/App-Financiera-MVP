"""
Detectores puros para Aki proactivo (#51). Cada función toma datos y devuelve
una lista de candidates a notificar. Cero side effects, totalmente testeables.

Triggers cubiertos:
- budget_at_risk: >70% gastado en <60% del período
- unusual_spend: gasto >2x el promedio de esa categoría en 3 meses
- income_unassigned: ingreso recibido sin meta/budget asignado en últimos 3 días
- goal_at_risk: meta con deadline cerca (<30 días) y progreso bajo (<60%)

`today` se pasa explícito para que los tests sean deterministas.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta
from decimal import Decimal
from statistics import mean
from typing import List, Optional


@dataclass
class TriggerCandidate:
    type: str           # 'budget_at_risk' | 'unusual_spend' | etc.
    dedup_key: str      # estable por user+tipo+período+entidad
    headline: str
    body_html: str


def detect_budget_at_risk(
    budget_total: Decimal,
    spent_to_date: Decimal,
    day_of_month: int,
    days_in_month: int,
    category_name: str,
    today: date,
) -> Optional[TriggerCandidate]:
    if budget_total <= 0 or day_of_month <= 0:
        return None
    pct_period = day_of_month / days_in_month
    pct_spent = float(spent_to_date / budget_total) if budget_total > 0 else 0
    # Regla: >70% gastado cuando todavía no se cumplió el 60% del mes.
    if pct_spent < 0.7 or pct_period >= 0.6:
        return None
    remaining = budget_total - spent_to_date
    days_left = days_in_month - day_of_month
    return TriggerCandidate(
        type="budget_at_risk",
        dedup_key=f"budget_at_risk:{category_name}:{today.year}-{today.month:02d}",
        headline=f"Tu budget de {category_name} está en riesgo",
        body_html=(
            f"<p>Ya gastaste el <strong>{pct_spent*100:.0f}%</strong> de tu budget de {category_name} "
            f"y todavía quedan <strong>{days_left} días</strong> del mes.</p>"
            f"<p>Te quedan ~<strong>{remaining}</strong> para los próximos {days_left} días.</p>"
        ),
    )


def detect_unusual_spend(
    tx_amount: Decimal,
    historical_avg: Decimal,
    category_name: str,
    today: date,
    tx_id: str,
) -> Optional[TriggerCandidate]:
    if historical_avg <= 0:
        return None
    ratio = float(abs(tx_amount) / historical_avg)
    if ratio < 2.0:
        return None
    return TriggerCandidate(
        type="unusual_spend",
        dedup_key=f"unusual_spend:{tx_id}",
        headline=f"Gasto inusual en {category_name}",
        body_html=(
            f"<p>Detectamos un cargo de <strong>{abs(tx_amount)}</strong> en {category_name}, "
            f"que es <strong>{ratio:.1f}x</strong> tu promedio de los últimos 3 meses.</p>"
        ),
    )


def detect_goal_at_risk(
    goal_name: str,
    progress_pct: float,
    days_to_deadline: int,
    today: date,
    goal_id: str,
) -> Optional[TriggerCandidate]:
    if days_to_deadline >= 30 or progress_pct >= 60:
        return None
    if days_to_deadline < 0:
        return None
    return TriggerCandidate(
        type="goal_at_risk",
        dedup_key=f"goal_at_risk:{goal_id}:{today.isoformat()}",
        headline=f"Tu meta '{goal_name}' está en riesgo",
        body_html=(
            f"<p>Faltan solo <strong>{days_to_deadline} días</strong> para tu deadline "
            f"y vas <strong>{progress_pct:.0f}%</strong> del objetivo.</p>"
            f"<p>Considerá ajustar el target o sumar un aporte extra.</p>"
        ),
    )
