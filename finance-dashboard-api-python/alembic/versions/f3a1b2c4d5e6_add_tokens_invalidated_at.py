"""add tokens_invalidated_at to users (JWT revocation)

Revision ID: f3a1b2c4d5e6
Revises: cd1f8a2b9e34
Create Date: 2026-05-16 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'f3a1b2c4d5e6'
down_revision: Union[str, Sequence[str], None] = 'cd1f8a2b9e34'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Idempotente: tolera que la columna ya exista (puede pasar si el version_num
    # se desincronizó del código deployado, ver historial de incidente 2026-05-16).
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS tokens_invalidated_at TIMESTAMP WITH TIME ZONE")


def downgrade() -> None:
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS tokens_invalidated_at")
