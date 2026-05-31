"""
Seed para probar la detección de suscripciones (#61).

Crea un usuario dedicado con ~5 patrones de suscripción no marcados (Netflix,
Spotify, OpenAI, GitHub, Gym) repartidos durante ~5 meses, intercalados con
gastos puntuales como ruido. Importante: NO crea RecurringTransaction para
estos cargos — la idea es que el detector los proponga.

Credenciales:
    subs-test@vuelto.app / Subs2025!

Uso:
    cd finance-dashboard-api-python
    python seed_subscriptions_test_user.py
"""

import os
import sys
import io
import uuid
import random
from datetime import date, timedelta
from decimal import Decimal
from dotenv import load_dotenv

# Windows console default cp1252 rompe con caracteres Unicode (·, ✓, etc.).
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

load_dotenv()

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("ERROR: DATABASE_URL no encontrada en .env")
    sys.exit(1)

engine = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine)
db = Session()

from app.core.security import get_password_hash
from app.database.models import (
    User, Account, AccountType,
    Category, CategoryType,
    Transaction,
)

EMAIL = "subs-test@vuelto.app"
PASSWORD = "Subs2025!"
NAME = "Test Suscripciones"

# Determinístico — facilita re-ejecutar con los mismos datos.
random.seed(42)

# ── Limpiar usuario existente ─────────────────────────────────
existing = db.query(User).filter(User.email == EMAIL).first()
if existing:
    db.delete(existing)
    db.commit()
    print(f"Usuario {EMAIL} eliminado. Recreando...")

# ── Crear usuario ─────────────────────────────────────────────
user = User(
    id=str(uuid.uuid4()),
    email=EMAIL,
    password_hash=get_password_hash(PASSWORD),
    name=NAME,
    currency="ARS",
    onboarding_completed=True,
)
db.add(user)
db.flush()

# ── Cuenta ────────────────────────────────────────────────────
cuenta = Account(
    id=str(uuid.uuid4()), user_id=user.id,
    name="Cuenta principal", type=AccountType.CHECKING,
    balance=Decimal("0"), currency="ARS",
)
db.add(cuenta)
db.flush()

# ── Categorías ────────────────────────────────────────────────
cats = {
    "Entretenimiento": Category(id=str(uuid.uuid4()), user_id=user.id, name="Entretenimiento", type=CategoryType.EXPENSE, color="#EF4444", icon="film",         is_default=True),
    "Servicios":       Category(id=str(uuid.uuid4()), user_id=user.id, name="Servicios",       type=CategoryType.EXPENSE, color="#EC4899", icon="zap",          is_default=True),
    "Salud":           Category(id=str(uuid.uuid4()), user_id=user.id, name="Salud",           type=CategoryType.EXPENSE, color="#14B8A6", icon="heart",        is_default=True),
    "Alimentación":    Category(id=str(uuid.uuid4()), user_id=user.id, name="Alimentación",    type=CategoryType.EXPENSE, color="#F59E0B", icon="utensils",     is_default=True),
    "Transporte":      Category(id=str(uuid.uuid4()), user_id=user.id, name="Transporte",      type=CategoryType.EXPENSE, color="#3B82F6", icon="car",          is_default=True),
    "Otros Gastos":    Category(id=str(uuid.uuid4()), user_id=user.id, name="Otros Gastos",    type=CategoryType.EXPENSE, color="#6B7280", icon="more-horizontal", is_default=True),
}
for c in cats.values():
    db.add(c)
db.flush()

today = date.today()

def make_tx(category, amount, desc, day_offset):
    return Transaction(
        id=str(uuid.uuid4()),
        account_id=cuenta.id,
        category_id=category.id,
        amount=Decimal(str(amount)),
        description=desc,
        transaction_date=today - timedelta(days=day_offset),
    )

# ── Patrones de suscripción (sin recurring asociada) ──────────
# Cada uno: 5-6 cargos a ~30 días, con jitter pequeño en monto y fecha.
subscription_patterns = [
    # (descripción, monto, categoría, cantidad de ocurrencias)
    ("Netflix",                -4500, cats["Entretenimiento"], 5),
    ("Spotify Premium",        -2900, cats["Entretenimiento"], 6),
    ("OPENAI *SUBSCRIPTION",   -7200, cats["Servicios"],       4),
    ("GitHub Copilot",         -6500, cats["Servicios"],       5),
    ("SportClub gimnasio",    -18500, cats["Salud"],           5),
]

transactions: list[Transaction] = []
for desc, base_amount, category, n in subscription_patterns:
    for i in range(n):
        # día = hoy - (i * ~30) con jitter de ±3 días.
        days_ago = i * 30 + random.randint(-3, 3) + 2
        # monto = base ± 3% (dentro del ±10% requerido por el detector).
        amount = base_amount * (1 + random.uniform(-0.03, 0.03))
        amount = round(amount, 2)
        # Algunas descripciones traen números variables (más realista, OPENAI *SUB 123 etc.)
        suffix = f" {random.randint(1000, 9999)}" if "OPENAI" in desc else ""
        transactions.append(make_tx(category, amount, desc + suffix, days_ago))

# ── Ruido: gastos puntuales que NO deben aparecer como sugerencia ──
noise = [
    (cats["Alimentación"], -8200,  "Supermercado Día",     2),
    (cats["Alimentación"], -12500, "Verdulería",           5),
    (cats["Alimentación"], -6300,  "Almacén barrio",       11),
    (cats["Alimentación"], -15800, "Carrefour",            22),
    (cats["Transporte"],   -4500,  "Nafta YPF",            7),
    (cats["Transporte"],   -3800,  "SUBE recarga",         18),
    (cats["Transporte"],   -5200,  "Uber",                 28),
    (cats["Otros Gastos"], -2500,  "Peluquería",           14),
    (cats["Otros Gastos"], -9800,  "Regalo cumpleaños",    45),
    (cats["Entretenimiento"], -8000, "Cine + cena",        60),
    (cats["Alimentación"], -7500,  "PedidosYa",            8),     # solo 1 ocurrencia
    (cats["Alimentación"], -8200,  "PedidosYa",            38),    # solo 2 ocurrencias
]
for category, amount, desc, days_ago in noise:
    transactions.append(make_tx(category, amount, desc, days_ago))

for t in transactions:
    db.add(t)

db.commit()
db.close()

print()
print("✓ Usuario de prueba para detección de suscripciones creado.")
print()
print(f"  Email:    {EMAIL}")
print(f"  Password: {PASSWORD}")
print()
print("Datos sembrados:")
print("  - 1 cuenta (Cuenta principal)")
print(f"  - {len(cats)} categorías de gasto")
print(f"  - {len(subscription_patterns)} patrones de suscripción esperables:")
for desc, amt, _, n in subscription_patterns:
    print(f"      · {desc:<24} ~${abs(amt):>6,}  ×{n}")
print(f"  - {len(noise)} gastos puntuales de ruido (no deberían sugerirse)")
print()
print("Para probar:")
print("  1. Login con las credenciales de arriba")
print("  2. Ir a /recurring")
print("  3. Debería aparecer un banner con 5 sugerencias")
