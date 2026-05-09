"""
Script de seed para crear usuario demo con datos completos en todas las funcionalidades.
Credenciales: prueba@finanzapp.com / Demo2025!

Uso:
    cd finance-dashboard-api-python
    python seed_demo_user.py
"""

import os
import sys
import uuid
from datetime import date, timedelta
from decimal import Decimal
from dotenv import load_dotenv

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
    Budget, BudgetPeriod,
    SavingGoal,
    RecurringTransaction, RecurrenceFrequency
)

DEMO_EMAIL = "prueba@finanzapp.com"
DEMO_PASSWORD = "Demo2025!"
DEMO_NAME = "Usuario Demo"

# ── Limpiar usuario existente ─────────────────────────────────
existing = db.query(User).filter(User.email == DEMO_EMAIL).first()
if existing:
    db.delete(existing)
    db.commit()
    print(f"Usuario {DEMO_EMAIL} eliminado. Recreando...")

# ── Crear usuario ─────────────────────────────────────────────
user = User(
    id=str(uuid.uuid4()),
    email=DEMO_EMAIL,
    password_hash=get_password_hash(DEMO_PASSWORD),
    name=DEMO_NAME,
    currency="ARS",
    dark_mode=False,
)
db.add(user)
db.flush()
print(f"Usuario creado: {user.id}")

# ── Cuentas ───────────────────────────────────────────────────
cuenta_efectivo = Account(
    id=str(uuid.uuid4()), user_id=user.id,
    name="Efectivo", type=AccountType.CHECKING,
    balance=Decimal("45000"), currency="ARS",
)
cuenta_banco = Account(
    id=str(uuid.uuid4()), user_id=user.id,
    name="Banco BBVA", type=AccountType.SAVINGS,
    balance=Decimal("280000"), currency="ARS",
)
cuenta_credito = Account(
    id=str(uuid.uuid4()), user_id=user.id,
    name="Visa Naranja", type=AccountType.CREDIT,
    balance=Decimal("-15000"), currency="ARS",
)
db.add_all([cuenta_efectivo, cuenta_banco, cuenta_credito])
db.flush()
print("Cuentas creadas.")

# ── Categorías ────────────────────────────────────────────────
cats = {
    "Salario":         Category(id=str(uuid.uuid4()), user_id=user.id, name="Salario",         type=CategoryType.INCOME,  color="#10B981", icon="briefcase",     is_default=True),
    "Freelance":       Category(id=str(uuid.uuid4()), user_id=user.id, name="Freelance",       type=CategoryType.INCOME,  color="#059669", icon="laptop",        is_default=True),
    "Inversiones":     Category(id=str(uuid.uuid4()), user_id=user.id, name="Inversiones",     type=CategoryType.INCOME,  color="#047857", icon="trending-up",   is_default=True),
    "Otros Ingresos":  Category(id=str(uuid.uuid4()), user_id=user.id, name="Otros Ingresos",  type=CategoryType.INCOME,  color="#065F46", icon="plus-circle",   is_default=True),
    "Alimentación":    Category(id=str(uuid.uuid4()), user_id=user.id, name="Alimentación",    type=CategoryType.EXPENSE, color="#F59E0B", icon="utensils",      is_default=True),
    "Transporte":      Category(id=str(uuid.uuid4()), user_id=user.id, name="Transporte",      type=CategoryType.EXPENSE, color="#3B82F6", icon="car",           is_default=True),
    "Vivienda":        Category(id=str(uuid.uuid4()), user_id=user.id, name="Vivienda",        type=CategoryType.EXPENSE, color="#8B5CF6", icon="home",          is_default=True),
    "Servicios":       Category(id=str(uuid.uuid4()), user_id=user.id, name="Servicios",       type=CategoryType.EXPENSE, color="#EC4899", icon="zap",           is_default=True),
    "Entretenimiento": Category(id=str(uuid.uuid4()), user_id=user.id, name="Entretenimiento", type=CategoryType.EXPENSE, color="#EF4444", icon="film",          is_default=True),
    "Salud":           Category(id=str(uuid.uuid4()), user_id=user.id, name="Salud",           type=CategoryType.EXPENSE, color="#14B8A6", icon="heart",         is_default=True),
    "Educación":       Category(id=str(uuid.uuid4()), user_id=user.id, name="Educación",       type=CategoryType.EXPENSE, color="#6366F1", icon="book",          is_default=True),
    "Compras":         Category(id=str(uuid.uuid4()), user_id=user.id, name="Compras",         type=CategoryType.EXPENSE, color="#F97316", icon="shopping-bag",  is_default=True),
    "Otros Gastos":    Category(id=str(uuid.uuid4()), user_id=user.id, name="Otros Gastos",    type=CategoryType.EXPENSE, color="#6B7280", icon="more-horizontal",is_default=True),
}
for c in cats.values():
    db.add(c)
db.flush()
print("Categorías creadas.")

# ── Transacciones (últimos 3 meses) ───────────────────────────
today = date.today()

def tx(account, category, amount, desc, days_ago):
    return Transaction(
        id=str(uuid.uuid4()),
        account_id=account.id,
        category_id=category.id,
        amount=Decimal(str(amount)),
        description=desc,
        transaction_date=today - timedelta(days=days_ago),
    )

transactions = [
    # ── Mes actual ──
    tx(cuenta_banco,    cats["Salario"],         450000,  "Sueldo Mayo",                    5),
    tx(cuenta_banco,    cats["Freelance"],        80000,   "Proyecto web cliente",           8),
    tx(cuenta_efectivo, cats["Alimentación"],    -12500,   "Super Día",                      2),
    tx(cuenta_efectivo, cats["Alimentación"],    -8200,    "Verdulería y carnicería",        4),
    tx(cuenta_credito,  cats["Entretenimiento"], -4500,    "Netflix",                        3),
    tx(cuenta_credito,  cats["Entretenimiento"], -3200,    "Spotify",                        3),
    tx(cuenta_efectivo, cats["Transporte"],      -6800,    "SUBE (colectivo)",               6),
    tx(cuenta_credito,  cats["Salud"],           -15000,   "Obra social prepaga",            1),
    tx(cuenta_credito,  cats["Compras"],         -22000,   "Ropa Zara",                      9),
    tx(cuenta_banco,    cats["Servicios"],       -8500,    "Internet Fibertel",              7),
    tx(cuenta_banco,    cats["Vivienda"],        -85000,   "Alquiler Mayo",                  5),
    tx(cuenta_efectivo, cats["Educación"],       -12000,   "Curso de inglés",                10),

    # ── Mes anterior ──
    tx(cuenta_banco,    cats["Salario"],         450000,  "Sueldo Abril",                   35),
    tx(cuenta_banco,    cats["Inversiones"],     25000,   "Dividendos FCI",                 40),
    tx(cuenta_efectivo, cats["Alimentación"],    -11800,   "Super Carrefour",                28),
    tx(cuenta_efectivo, cats["Alimentación"],    -9500,    "Almacén",                        32),
    tx(cuenta_credito,  cats["Entretenimiento"], -4500,    "Netflix",                        33),
    tx(cuenta_credito,  cats["Compras"],         -35000,   "Electrodomésticos",              29),
    tx(cuenta_efectivo, cats["Transporte"],      -7200,    "SUBE",                           36),
    tx(cuenta_credito,  cats["Salud"],           -15000,   "Obra social prepaga",            31),
    tx(cuenta_banco,    cats["Servicios"],       -8500,    "Internet",                       37),
    tx(cuenta_banco,    cats["Vivienda"],        -85000,   "Alquiler Abril",                 35),
    tx(cuenta_efectivo, cats["Otros Gastos"],    -3500,    "Peluquería",                     30),
    tx(cuenta_banco,    cats["Freelance"],        60000,   "Diseño logo empresa",            38),

    # ── Hace 2 meses ──
    tx(cuenta_banco,    cats["Salario"],         430000,  "Sueldo Marzo",                   65),
    tx(cuenta_efectivo, cats["Alimentación"],    -13200,   "Super Walmart",                  58),
    tx(cuenta_credito,  cats["Entretenimiento"], -4500,    "Netflix",                        63),
    tx(cuenta_credito,  cats["Entretenimiento"], -8000,    "Cine + cena",                    60),
    tx(cuenta_efectivo, cats["Transporte"],      -6500,    "SUBE",                           66),
    tx(cuenta_credito,  cats["Salud"],           -15000,   "Obra social prepaga",            61),
    tx(cuenta_banco,    cats["Servicios"],       -8500,    "Internet",                       67),
    tx(cuenta_banco,    cats["Vivienda"],        -80000,   "Alquiler Marzo",                 65),
    tx(cuenta_credito,  cats["Compras"],         -18000,   "Librería / útiles",              62),
    tx(cuenta_banco,    cats["Inversiones"],     18000,   "Intereses plazo fijo",           70),
    tx(cuenta_efectivo, cats["Otros Ingresos"],  15000,   "Venta de artículos usados",      72),
]

for t in transactions:
    db.add(t)
db.flush()
print(f"{len(transactions)} transacciones creadas.")

# ── Presupuestos ──────────────────────────────────────────────
budgets = [
    Budget(id=str(uuid.uuid4()), user_id=user.id, category_id=cats["Alimentación"].id,    amount=Decimal("40000"),  period=BudgetPeriod.MONTHLY, start_date=date(today.year, today.month, 1)),
    Budget(id=str(uuid.uuid4()), user_id=user.id, category_id=cats["Entretenimiento"].id, amount=Decimal("15000"),  period=BudgetPeriod.MONTHLY, start_date=date(today.year, today.month, 1)),
    Budget(id=str(uuid.uuid4()), user_id=user.id, category_id=cats["Transporte"].id,      amount=Decimal("12000"),  period=BudgetPeriod.MONTHLY, start_date=date(today.year, today.month, 1)),
    Budget(id=str(uuid.uuid4()), user_id=user.id, category_id=cats["Compras"].id,         amount=Decimal("30000"),  period=BudgetPeriod.MONTHLY, start_date=date(today.year, today.month, 1)),
    Budget(id=str(uuid.uuid4()), user_id=user.id, category_id=cats["Salud"].id,           amount=Decimal("20000"),  period=BudgetPeriod.MONTHLY, start_date=date(today.year, today.month, 1)),
]
for b in budgets:
    db.add(b)
db.flush()
print("Presupuestos creados.")

# ── Metas de Ahorro ───────────────────────────────────────────
goals = [
    SavingGoal(
        id=str(uuid.uuid4()), user_id=user.id,
        name="Vacaciones Europa",
        target_amount=Decimal("800000"),
        current_amount=Decimal("215000"),
        deadline=date(today.year + 1, 1, 15),
        color="#3B82F6",
    ),
    SavingGoal(
        id=str(uuid.uuid4()), user_id=user.id,
        name="Auto nuevo",
        target_amount=Decimal("3500000"),
        current_amount=Decimal("420000"),
        deadline=date(today.year + 2, 6, 1),
        color="#F59E0B",
    ),
    SavingGoal(
        id=str(uuid.uuid4()), user_id=user.id,
        name="Fondo de Emergencia",
        target_amount=Decimal("450000"),
        current_amount=Decimal("325000"),
        deadline=date(today.year, 12, 31),
        color="#10B981",
    ),
]
for g in goals:
    db.add(g)
db.flush()
print("Metas de ahorro creadas.")

# ── Transacciones Recurrentes ─────────────────────────────────
next_month_1 = date(today.year, today.month, 1) + timedelta(days=32)
next_month_1 = date(next_month_1.year, next_month_1.month, 1)

recurrentes = [
    RecurringTransaction(
        id=str(uuid.uuid4()), user_id=user.id,
        account_id=cuenta_banco.id,
        category_id=cats["Salario"].id,
        amount=Decimal("450000"),
        description="Sueldo mensual",
        frequency=RecurrenceFrequency.MONTHLY,
        start_date=date(today.year, today.month, 5),
        next_date=next_month_1.replace(day=5),
        is_active=True,
    ),
    RecurringTransaction(
        id=str(uuid.uuid4()), user_id=user.id,
        account_id=cuenta_credito.id,
        category_id=cats["Entretenimiento"].id,
        amount=Decimal("-4500"),
        description="Netflix",
        frequency=RecurrenceFrequency.MONTHLY,
        start_date=date(today.year, today.month, 1),
        next_date=next_month_1,
        is_active=True,
    ),
    RecurringTransaction(
        id=str(uuid.uuid4()), user_id=user.id,
        account_id=cuenta_banco.id,
        category_id=cats["Vivienda"].id,
        amount=Decimal("-85000"),
        description="Alquiler mensual",
        frequency=RecurrenceFrequency.MONTHLY,
        start_date=date(today.year, today.month, 5),
        next_date=next_month_1.replace(day=5),
        is_active=True,
    ),
    RecurringTransaction(
        id=str(uuid.uuid4()), user_id=user.id,
        account_id=cuenta_banco.id,
        category_id=cats["Servicios"].id,
        amount=Decimal("-8500"),
        description="Internet Fibertel",
        frequency=RecurrenceFrequency.MONTHLY,
        start_date=date(today.year, today.month, 10),
        next_date=next_month_1.replace(day=10),
        is_active=True,
    ),
    RecurringTransaction(
        id=str(uuid.uuid4()), user_id=user.id,
        account_id=cuenta_credito.id,
        category_id=cats["Salud"].id,
        amount=Decimal("-15000"),
        description="Obra social Medifé",
        frequency=RecurrenceFrequency.MONTHLY,
        start_date=date(today.year, today.month, 1),
        next_date=next_month_1,
        is_active=True,
    ),
]
for r in recurrentes:
    db.add(r)
db.flush()
print("Transacciones recurrentes creadas.")

# ── Commit final ──────────────────────────────────────────────
db.commit()
db.close()

print("\n✓ Usuario demo creado exitosamente:")
print(f"  Email:    {DEMO_EMAIL}")
print(f"  Password: {DEMO_PASSWORD}")
print(f"\nDatos cargados:")
print(f"  - 3 cuentas (Efectivo, Banco BBVA, Visa Naranja)")
print(f"  - 13 categorías")
print(f"  - {len(transactions)} transacciones (últimos 3 meses)")
print(f"  - {len(budgets)} presupuestos")
print(f"  - {len(goals)} metas de ahorro")
print(f"  - {len(recurrentes)} transacciones recurrentes")
