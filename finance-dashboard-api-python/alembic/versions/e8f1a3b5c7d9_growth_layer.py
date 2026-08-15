"""growth layer: atribucion de adquisicion + referidos + captura de valor

Revision ID: e8f1a3b5c7d9
Revises: d5e7f9a1b3c5
Create Date: 2026-08-15

- users.acquisition_*: atribucion first-touch para poder calcular CAC por canal
- users.referral_code / referred_by_user_id: motor viral
- users.plan_type / plan_expires_at: monetizacion (free | premium)
- referrals: invitaciones concretadas, con estado pending -> qualified
- pricing_intents: senales de willingness-to-pay desde la pricing page
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "e8f1a3b5c7d9"
down_revision: Union[str, Sequence[str], None] = "d5e7f9a1b3c5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# Toda tabla nueva en `public` habilita RLS — ver checklist en b6c7d8e9f0a1.
NEW_TABLES = ["referrals", "pricing_intents"]


def upgrade() -> None:
    # ── users: atribucion ────────────────────────────────────────────────
    op.add_column("users", sa.Column("acquisition_source", sa.String(), nullable=True))
    op.add_column("users", sa.Column("acquisition_medium", sa.String(), nullable=True))
    op.add_column("users", sa.Column("acquisition_campaign", sa.String(), nullable=True))
    op.add_column("users", sa.Column("acquisition_referrer", sa.String(), nullable=True))
    op.add_column("users", sa.Column("acquisition_landing", sa.String(), nullable=True))

    # ── users: referidos ─────────────────────────────────────────────────
    op.add_column("users", sa.Column("referral_code", sa.String(), nullable=True))
    op.create_index("ix_users_referral_code", "users", ["referral_code"], unique=True)
    op.add_column("users", sa.Column("referred_by_user_id", sa.String(), nullable=True))
    op.create_foreign_key(
        "fk_users_referred_by_user_id",
        "users", "users",
        ["referred_by_user_id"], ["id"],
        ondelete="SET NULL",
    )

    # ── users: monetizacion ──────────────────────────────────────────────
    op.add_column(
        "users",
        sa.Column("plan_type", sa.String(), server_default="free", nullable=False),
    )
    op.add_column("users", sa.Column("plan_expires_at", sa.DateTime(timezone=True), nullable=True))

    # ── referrals ────────────────────────────────────────────────────────
    op.create_table(
        "referrals",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("referrer_user_id", sa.String(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("referred_user_id", sa.String(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("code_used", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False, server_default="pending"),
        sa.Column("qualified_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        # Un usuario solo puede ser referido una vez: sin esto se duplican recompensas.
        sa.UniqueConstraint("referred_user_id", name="uq_referral_referred_user"),
    )
    op.create_index("ix_referrals_referrer_user_id", "referrals", ["referrer_user_id"])

    # ── pricing_intents ──────────────────────────────────────────────────
    op.create_table(
        "pricing_intents",
        sa.Column("id", sa.String(), primary_key=True),
        # Nullable: la pricing page es publica, se mide sin sesion.
        sa.Column("user_id", sa.String(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("email", sa.String(), nullable=True),
        sa.Column("plan", sa.String(), nullable=False),
        sa.Column("price_shown_ars", sa.Numeric(12, 2), nullable=True),
        sa.Column("price_shown_usd", sa.Numeric(12, 2), nullable=True),
        sa.Column("action", sa.String(), nullable=False),
        sa.Column("feedback", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_pricing_intents_user_id", "pricing_intents", ["user_id"])
    op.create_index("ix_pricing_intents_email", "pricing_intents", ["email"])

    for table in NEW_TABLES:
        op.execute(f"ALTER TABLE public.{table} ENABLE ROW LEVEL SECURITY")


def downgrade() -> None:
    for table in NEW_TABLES:
        op.execute(f"ALTER TABLE public.{table} DISABLE ROW LEVEL SECURITY")

    op.drop_index("ix_pricing_intents_email", table_name="pricing_intents")
    op.drop_index("ix_pricing_intents_user_id", table_name="pricing_intents")
    op.drop_table("pricing_intents")

    op.drop_index("ix_referrals_referrer_user_id", table_name="referrals")
    op.drop_table("referrals")

    op.drop_column("users", "plan_expires_at")
    op.drop_column("users", "plan_type")
    op.drop_constraint("fk_users_referred_by_user_id", "users", type_="foreignkey")
    op.drop_column("users", "referred_by_user_id")
    op.drop_index("ix_users_referral_code", table_name="users")
    op.drop_column("users", "referral_code")
    op.drop_column("users", "acquisition_landing")
    op.drop_column("users", "acquisition_referrer")
    op.drop_column("users", "acquisition_campaign")
    op.drop_column("users", "acquisition_medium")
    op.drop_column("users", "acquisition_source")
