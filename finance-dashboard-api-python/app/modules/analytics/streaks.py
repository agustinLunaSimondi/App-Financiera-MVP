"""
#62 — "Día sin tarjeta" — Gamificación (Streaks)

Lógica pura de cálculo de streaks. Un "día sin gasto" es un día donde
todas las transacciones con amount < 0 son recurrentes (tienen recurring_id),
o no hay transacciones de gasto en absoluto.
"""
from datetime import date, timedelta
from typing import List, Dict, Any, Optional


# Badge thresholds
BADGES = [
    {"days": 7, "emoji": "🌱", "label": "Brote", "description": "7 días sin gastos no esenciales"},
    {"days": 30, "emoji": "🌳", "label": "Árbol", "description": "30 días — ¡un mes entero!"},
    {"days": 90, "emoji": "🏆", "label": "Campeón", "description": "90 días — disciplina de acero"},
]


def compute_streak(
    transactions: List[Dict[str, Any]],
    today: Optional[date] = None,
) -> Dict[str, Any]:
    """
    Calcula el streak actual y el más largo.

    Args:
        transactions: lista de dicts con al menos:
            - transaction_date (date)
            - amount (Decimal/float)
            - recurring_id (str | None)
        today: fecha de referencia (default: hoy)

    Returns:
        {
            "current_streak": int,
            "longest_streak": int,
            "last_zero_day": date | None,
            "badges": [{"emoji", "label", "description", "unlocked": bool}],
        }
    """
    if today is None:
        today = date.today()

    # Agrupar gastos manuales (no recurrentes, amount < 0) por fecha
    manual_expense_dates: set = set()
    for tx in transactions:
        tx_date = tx.get("transaction_date")
        if tx_date is None:
            continue
        # Solo gastos (amount < 0) que NO son recurrentes
        amount = float(tx.get("amount", 0))
        recurring_id = tx.get("recurring_id")
        if amount < 0 and not recurring_id:
            if isinstance(tx_date, str):
                tx_date = date.fromisoformat(tx_date)
            manual_expense_dates.add(tx_date)

    # Calcular streak actual: contar hacia atrás desde ayer
    # (hoy no cuenta porque el día no terminó)
    current_streak = 0
    check_date = today - timedelta(days=1)

    # Buscar la fecha más antigua con datos para no iterar infinito
    if not transactions:
        return _build_result(0, 0, None)

    all_dates = []
    for tx in transactions:
        d = tx.get("transaction_date")
        if d:
            if isinstance(d, str):
                d = date.fromisoformat(d)
            all_dates.append(d)

    if not all_dates:
        return _build_result(0, 0, None)

    earliest = min(all_dates)

    # Streak actual
    last_zero_day = None
    while check_date >= earliest:
        if check_date not in manual_expense_dates:
            current_streak += 1
            last_zero_day = check_date
            check_date -= timedelta(days=1)
        else:
            break

    # Streak más largo: recorrer todo el historial
    longest_streak = 0
    running_streak = 0
    scan_date = earliest

    while scan_date <= today - timedelta(days=1):
        if scan_date not in manual_expense_dates:
            running_streak += 1
            longest_streak = max(longest_streak, running_streak)
        else:
            running_streak = 0
        scan_date += timedelta(days=1)

    longest_streak = max(longest_streak, current_streak)

    return _build_result(current_streak, longest_streak, last_zero_day)


def _build_result(current: int, longest: int, last_zero_day) -> dict:
    badges = []
    for b in BADGES:
        badges.append({
            "emoji": b["emoji"],
            "label": b["label"],
            "description": b["description"],
            "days_required": b["days"],
            "unlocked": longest >= b["days"],
        })

    return {
        "current_streak": current,
        "longest_streak": longest,
        "last_zero_day": last_zero_day.isoformat() if last_zero_day else None,
        "badges": badges,
    }
