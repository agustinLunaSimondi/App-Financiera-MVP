"""enable RLS on tables created after the original RLS hardening pass

Revision ID: b6c7d8e9f0a1
Revises: e2f3a4b5c6d7
Create Date: 2026-07-01 12:00:00.000000

Mismo racional que a2b3c4d5e6f7: el backend se conecta como rol `postgres`
(pooler de Supabase) que bypassea RLS, así que habilitar RLS sin policies no
afecta a FastAPI. Cierra el acceso vía PostgREST con la anon/authenticated key
para las tablas creadas después de aquel pase.

Checklist "nueva tabla": toda migración que cree una tabla en `public` debe
incluir su propio `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`.
"""
from typing import Sequence, Union

from alembic import op


revision: str = 'b6c7d8e9f0a1'
down_revision: Union[str, Sequence[str], None] = 'e2f3a4b5c6d7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


TABLES = [
    "goal_rules",
    "notifications",
    "transaction_embeddings",
    "user_streaks",
    "benchmark_aggregates",
    "public_widgets",
    "events",
    "event_members",
    "event_expenses",
    "event_expense_splits",
    "aki_name_suggestions",
]


def upgrade() -> None:
    for table in TABLES:
        op.execute(f"ALTER TABLE public.{table} ENABLE ROW LEVEL SECURITY")


def downgrade() -> None:
    for table in TABLES:
        op.execute(f"ALTER TABLE public.{table} DISABLE ROW LEVEL SECURITY")
