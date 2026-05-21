"""enable RLS on all public tables (block PostgREST/anon access)

Revision ID: a2b3c4d5e6f7
Revises: f3a1b2c4d5e6
Create Date: 2026-05-20 12:00:00.000000

El backend se conecta como rol `postgres` (pooler de Supabase) que bypassea RLS,
asi que habilitar RLS sin policies no afecta a FastAPI. Lo que cierra es el
acceso via PostgREST con la anon/authenticated key, que es el vector que
levantaron los advisors rls_disabled_in_public y sensitive_columns_exposed.
"""
from typing import Sequence, Union

from alembic import op


revision: str = 'a2b3c4d5e6f7'
down_revision: Union[str, Sequence[str], None] = 'f3a1b2c4d5e6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


TABLES = [
    "users",
    "accounts",
    "categories",
    "recurring_transactions",
    "transactions",
    "budgets",
    "saving_goals",
    "mercadopago_connections",
    "alembic_version",
    "waitlist_emails",
]


def upgrade() -> None:
    for table in TABLES:
        op.execute(f"ALTER TABLE public.{table} ENABLE ROW LEVEL SECURITY")


def downgrade() -> None:
    for table in TABLES:
        op.execute(f"ALTER TABLE public.{table} DISABLE ROW LEVEL SECURITY")
