"""events: gastos compartidos en grupo (events + members + expenses + splits)

Revision ID: e2f3a4b5c6d7
Revises: d0e1f2a3b4c5
Create Date: 2026-06-01
"""
from alembic import op
import sqlalchemy as sa


revision = "e2f3a4b5c6d7"
down_revision = "d0e1f2a3b4c5"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "events",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("owner_id", sa.String(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("description", sa.String(), nullable=True),
        sa.Column("event_date", sa.Date(), nullable=True),
        sa.Column("currency", sa.String(), nullable=False, server_default="ARS"),
        sa.Column("status", sa.String(), nullable=False, server_default="ACTIVE"),
        sa.Column("cover_emoji", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_index("ix_events_owner_id", "events", ["owner_id"])

    op.create_table(
        "event_members",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("event_id", sa.String(), sa.ForeignKey("events.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", sa.String(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=True),
        sa.Column("display_name", sa.String(), nullable=False),
        sa.Column("email", sa.String(), nullable=True),
        sa.Column("role", sa.String(), nullable=False, server_default="MEMBER"),
        sa.Column("joined_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.UniqueConstraint("event_id", "email", name="_event_member_email_uc"),
    )
    op.create_index("ix_event_members_event_id", "event_members", ["event_id"])

    op.create_table(
        "event_expenses",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("event_id", sa.String(), sa.ForeignKey("events.id", ondelete="CASCADE"), nullable=False),
        sa.Column(
            "paid_by_member_id",
            sa.String(),
            sa.ForeignKey("event_members.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("description", sa.String(), nullable=False),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("expense_date", sa.Date(), nullable=False),
        sa.Column("receipt_url", sa.String(), nullable=True),
        sa.Column("receipt_filename", sa.String(), nullable=True),
        sa.Column("split_mode", sa.String(), nullable=False, server_default="equal"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_index("ix_event_expenses_event_id", "event_expenses", ["event_id"])

    op.create_table(
        "event_expense_splits",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column(
            "expense_id",
            sa.String(),
            sa.ForeignKey("event_expenses.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "member_id",
            sa.String(),
            sa.ForeignKey("event_members.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("share_amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("is_paid", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.create_index("ix_event_expense_splits_expense_id", "event_expense_splits", ["expense_id"])


def downgrade() -> None:
    op.drop_index("ix_event_expense_splits_expense_id", table_name="event_expense_splits")
    op.drop_table("event_expense_splits")
    op.drop_index("ix_event_expenses_event_id", table_name="event_expenses")
    op.drop_table("event_expenses")
    op.drop_index("ix_event_members_event_id", table_name="event_members")
    op.drop_table("event_members")
    op.drop_index("ix_events_owner_id", table_name="events")
    op.drop_table("events")
