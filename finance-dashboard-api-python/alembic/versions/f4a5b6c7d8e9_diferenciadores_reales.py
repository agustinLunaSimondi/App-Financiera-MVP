"""diferenciadores reales: goal_rules + notifications + transaction_embeddings + user email prefs

Revision ID: f4a5b6c7d8e9
Revises: e1c2d3a4b5f6
Create Date: 2026-05-23

- goal_rules: reglas de auto-depósito (#56)
- notifications: histórico para dedup (#51/#52)
- transaction_embeddings: cache de vectores (#55)
- users.email_weekly_snapshot + users.email_smart_alerts: opt-in defaults true
"""
from alembic import op
import sqlalchemy as sa


revision = "f4a5b6c7d8e9"
down_revision = "e1c2d3a4b5f6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # User email preferences (#51 #52)
    op.add_column(
        "users",
        sa.Column("email_weekly_snapshot", sa.Boolean(), server_default=sa.text("true"), nullable=False),
    )
    op.add_column(
        "users",
        sa.Column("email_smart_alerts", sa.Boolean(), server_default=sa.text("true"), nullable=False),
    )

    # goal_rules (#56)
    op.create_table(
        "goal_rules",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("user_id", sa.String(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("goal_id", sa.String(), sa.ForeignKey("saving_goals.id", ondelete="CASCADE"), nullable=False),
        sa.Column("trigger_category_id", sa.String(), sa.ForeignKey("categories.id", ondelete="CASCADE"), nullable=False),
        sa.Column("percentage", sa.Numeric(5, 2), nullable=True),
        sa.Column("fixed_amount", sa.Numeric(12, 2), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_goal_rules_user_id", "goal_rules", ["user_id"])
    op.create_index("ix_goal_rules_goal_id", "goal_rules", ["goal_id"])

    # notifications (#51 #52)
    op.create_table(
        "notifications",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("user_id", sa.String(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("type", sa.String(), nullable=False),
        sa.Column("dedup_key", sa.String(), nullable=False),
        sa.Column("channel", sa.String(), server_default="email", nullable=False),
        sa.Column("sent_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("user_id", "dedup_key", name="_user_dedup_key_uc"),
    )
    op.create_index("ix_notifications_user_id", "notifications", ["user_id"])
    op.create_index("ix_notifications_dedup_key", "notifications", ["dedup_key"])

    # transaction_embeddings (#55)
    op.create_table(
        "transaction_embeddings",
        sa.Column("transaction_id", sa.String(), sa.ForeignKey("transactions.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("embedding_json", sa.Text(), nullable=False),
        sa.Column("model", sa.String(), nullable=False, server_default="text-embedding-004"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("transaction_embeddings")
    op.drop_index("ix_notifications_dedup_key", table_name="notifications")
    op.drop_index("ix_notifications_user_id", table_name="notifications")
    op.drop_table("notifications")
    op.drop_index("ix_goal_rules_goal_id", table_name="goal_rules")
    op.drop_index("ix_goal_rules_user_id", table_name="goal_rules")
    op.drop_table("goal_rules")
    op.drop_column("users", "email_smart_alerts")
    op.drop_column("users", "email_weekly_snapshot")
