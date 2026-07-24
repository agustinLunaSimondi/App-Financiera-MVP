"""add password reset token fields to users

Revision ID: a3f5c7d9e1b2
Revises: b6c7d8e9f0a1
Create Date: 2026-07-24 00:00:00.000000

Nota: la cadena Alembic real de la DB compartida (Supabase) llega acá vía
b6c7d8e9f0a1 (mergeada desde main), no vía a1b2c3d4e5f6 (belvo) — ese branch
de `develop` nunca se aplicó contra esta DB. down_revision apunta al head
real para no romper `alembic upgrade head`.
"""
from typing import Sequence, Union

from alembic import op


revision: str = 'a3f5c7d9e1b2'
down_revision: Union[str, Sequence[str], None] = 'b6c7d8e9f0a1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_hash VARCHAR")
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires_at TIMESTAMP WITH TIME ZONE")


def downgrade() -> None:
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS reset_token_expires_at")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS reset_token_hash")
