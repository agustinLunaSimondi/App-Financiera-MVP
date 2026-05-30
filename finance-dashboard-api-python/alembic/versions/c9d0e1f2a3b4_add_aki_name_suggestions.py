"""add_aki_name_suggestions

Revision ID: c9d0e1f2a3b4
Revises: b8c9d0e1f2a3
Create Date: 2026-05-30

"""
from alembic import op
import sqlalchemy as sa

revision = "c9d0e1f2a3b4"
down_revision = "b8c9d0e1f2a3"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "aki_name_suggestions",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("name", sa.String(50), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_aki_name_suggestions_created_at", "aki_name_suggestions", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_aki_name_suggestions_created_at", table_name="aki_name_suggestions")
    op.drop_table("aki_name_suggestions")
