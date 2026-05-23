"""
#59 — Análisis comparativo anonimizado (Benchmark)

Compara el gasto del usuario por categoría contra el promedio de todos los
usuarios de la plataforma. Si hay menos de 50 usuarios, usa promedios
históricos del propio usuario como referencia + rangos AR típicos.
"""
from decimal import Decimal
from typing import List, Dict, Any, Optional
from datetime import date, timedelta
import logging

logger = logging.getLogger(__name__)

# Promedios AR típicos mensuales (en ARS, referencia mayo 2026).
# Fuente: estimaciones basadas en datos públicos de canasta básica/INDEC.
# Se usan como fallback cuando no hay masa crítica de usuarios.
AR_TYPICAL_MONTHLY = {
    "Supermercado": 180_000,
    "Delivery": 45_000,
    "Transporte": 35_000,
    "Servicios": 60_000,
    "Entretenimiento": 30_000,
    "Salud": 25_000,
    "Educación": 40_000,
    "Ropa": 35_000,
    "Hogar": 50_000,
    "Restaurantes": 40_000,
}

MIN_USERS_FOR_REAL_BENCHMARK = 50


def compute_benchmark(
    user_expenses_by_category: Dict[str, float],
    all_users_expenses: Optional[List[Dict[str, float]]] = None,
    total_users: int = 1,
) -> List[Dict[str, Any]]:
    """
    Genera comparativa por categoría.

    Args:
        user_expenses_by_category: {category_name: total_gasto_mensual}
        all_users_expenses: lista de dicts {category_name: total} por cada usuario
            (None si no hay suficientes usuarios)
        total_users: cantidad total de usuarios activos

    Returns:
        Lista de comparaciones por categoría.
    """
    comparisons = []

    use_real_data = (
        all_users_expenses is not None
        and total_users >= MIN_USERS_FOR_REAL_BENCHMARK
    )

    for category, user_amount in user_expenses_by_category.items():
        if user_amount <= 0:
            continue

        if use_real_data:
            # Promedio real de todos los usuarios
            category_totals = [
                u.get(category, 0) for u in all_users_expenses if u.get(category, 0) > 0
            ]
            if len(category_totals) >= 10:
                avg_amount = sum(category_totals) / len(category_totals)
                sorted_totals = sorted(category_totals)
                # Calcular percentil del usuario
                rank = sum(1 for t in sorted_totals if t <= user_amount)
                percentile = int((rank / len(sorted_totals)) * 100)
            else:
                avg_amount = AR_TYPICAL_MONTHLY.get(category, user_amount)
                percentile = _estimate_percentile(user_amount, avg_amount)
        else:
            # Fallback: promedios AR típicos
            avg_amount = AR_TYPICAL_MONTHLY.get(category, user_amount)
            percentile = _estimate_percentile(user_amount, avg_amount)

        ratio = round(user_amount / avg_amount, 1) if avg_amount > 0 else 1.0
        insight = _generate_insight(category, ratio)

        comparisons.append({
            "category": category,
            "user_amount": round(user_amount, 2),
            "avg_amount": round(avg_amount, 2),
            "ratio": ratio,
            "percentile": percentile,
            "insight": insight,
            "source": "real" if use_real_data else "estimated",
        })

    # Ordenar por ratio descendente (las categorías donde más se excede van primero)
    comparisons.sort(key=lambda c: c["ratio"], reverse=True)

    return comparisons


def _estimate_percentile(user_amount: float, avg_amount: float) -> int:
    """Estimación simple de percentil basada en la relación con el promedio."""
    ratio = user_amount / avg_amount if avg_amount > 0 else 1.0
    if ratio <= 0.5:
        return 15
    elif ratio <= 0.75:
        return 30
    elif ratio <= 1.0:
        return 50
    elif ratio <= 1.5:
        return 70
    elif ratio <= 2.0:
        return 85
    else:
        return 95


def _generate_insight(category: str, ratio: float) -> str:
    """Genera un insight amigable estilo Aki."""
    if ratio <= 0.5:
        return f"¡Excelente! Gastás mucho menos que el promedio en {category}. 💪"
    elif ratio <= 0.8:
        return f"Estás por debajo del promedio en {category}. ¡Bien ahí! 👍"
    elif ratio <= 1.2:
        return f"Tu gasto en {category} está en línea con el promedio. 📊"
    elif ratio <= 2.0:
        return f"Gastás {ratio}x el promedio en {category}. ¿Podrías optimizar? 🤔"
    else:
        return f"Ojo: gastás {ratio}x el promedio en {category}. Revisá si podés recortar. ⚠️"
