"""add_waitlist_emails

Revision ID: cd1f8a2b9e34
Revises: ab0b8c039ca0
Create Date: 2026-05-13 20:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'cd1f8a2b9e34'
down_revision: Union[str, Sequence[str], None] = 'ab0b8c039ca0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'waitlist_emails',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('email', sa.String(), nullable=False),
        sa.Column('source', sa.String(), nullable=True),
        sa.Column('referrer', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email'),
    )
    op.create_index('ix_waitlist_emails_email', 'waitlist_emails', ['email'])


def downgrade() -> None:
    op.drop_index('ix_waitlist_emails_email', table_name='waitlist_emails')
    op.drop_table('waitlist_emails')
