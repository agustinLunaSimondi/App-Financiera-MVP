"""belvo: tabla de conexiones bancarias/billeteras vía Belvo

Revision ID: a1b2c3d4e5f6
Revises: e2f3a4b5c6d7
Create Date: 2026-06-27
"""
from alembic import op
import sqlalchemy as sa


revision = "a1b2c3d4e5f6"
down_revision = "e2f3a4b5c6d7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "belvo_connections",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("user_id", sa.String(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("link_id", sa.String(), nullable=False),
        sa.Column("institution_name", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False, server_default="valid"),
        sa.Column("last_sync_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.UniqueConstraint("user_id", "link_id", name="_user_belvo_link_uc"),
    )
    op.create_index("ix_belvo_connections_user_id", "belvo_connections", ["user_id"])
    # RLS sin policies, igual que el resto de tablas (ver a2b3c4d5e6f7): bloquea
    # PostgREST/anon, no afecta a FastAPI porque el backend usa el rol postgres.
    op.execute("ALTER TABLE public.belvo_connections ENABLE ROW LEVEL SECURITY")


def downgrade() -> None:
    op.execute("ALTER TABLE public.belvo_connections DISABLE ROW LEVEL SECURITY")
    op.drop_index("ix_belvo_connections_user_id", table_name="belvo_connections")
    op.drop_table("belvo_connections")
