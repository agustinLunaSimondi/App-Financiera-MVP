"""add_onboarding_completed_to_users

Revision ID: ab0b8c039ca0
Revises: 001_init_all
Create Date: 2026-05-13 19:41:30.501222

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'ab0b8c039ca0'
down_revision: Union[str, Sequence[str], None] = '001_init_all'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column(
        'onboarding_completed',
        sa.Boolean(),
        server_default='false',
        nullable=False,
    ))
    # Usuarios existentes ya completaron el onboarding (tenían la app antes de esta feature)
    op.execute("UPDATE users SET onboarding_completed = true")


def downgrade() -> None:
    op.drop_column('users', 'onboarding_completed')
