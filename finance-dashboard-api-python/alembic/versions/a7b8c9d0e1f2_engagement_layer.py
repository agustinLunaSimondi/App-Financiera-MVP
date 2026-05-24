"""engagement layer: streaks + benchmarks + widgets + envelopes + AFIP deducibles

Revision ID: a7b8c9d0e1f2
Revises: f4a5b6c7d8e9
Create Date: 2026-05-23

- user_streaks: gamificación de días sin gasto no esencial (#62)
- benchmark_aggregates: agregados anonimizados precomputados (#59)
- public_widgets: tokens para embeber dashboard en otros sitios (#64)
- users.budget_mode: 'standard' | 'envelopes' (#60)
- users.benchmark_opt_in + age_range + geo_region: opt-in al benchmark (#59)
- categories.tax_deductible: marca para reporte AFIP (#63)
"""
from alembic import op
import sqlalchemy as sa


revision = "a7b8c9d0e1f2"
down_revision = "f4a5b6c7d8e9"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # users
    op.add_column(
        "users",
        sa.Column("budget_mode", sa.String(), server_default="standard", nullable=False),
    )
    op.add_column(
        "users",
        sa.Column("benchmark_opt_in", sa.Boolean(), server_default=sa.text("false"), nullable=False),
    )
    op.add_column("users", sa.Column("age_range", sa.String(), nullable=True))
    op.add_column("users", sa.Column("geo_region", sa.String(), nullable=True))

    # categories
    op.add_column(
        "categories",
        sa.Column("tax_deductible", sa.Boolean(), server_default=sa.text("false"), nullable=False),
    )

    # user_streaks (#62)
    op.create_table(
        "user_streaks",
        sa.Column("user_id", sa.String(), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("current_streak", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("longest_streak", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("last_zero_day_at", sa.Date(), nullable=True),
        sa.Column("last_evaluated_on", sa.Date(), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # benchmark_aggregates (#59)
    op.create_table(
        "benchmark_aggregates",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("age_range", sa.String(), nullable=False),
        sa.Column("geo_region", sa.String(), nullable=False),
        sa.Column("category_name", sa.String(), nullable=False),
        sa.Column("period", sa.String(), nullable=False, server_default="monthly"),
        sa.Column("sample_size", sa.Integer(), nullable=False),
        sa.Column("p25", sa.Numeric(14, 2), nullable=False),
        sa.Column("p50", sa.Numeric(14, 2), nullable=False),
        sa.Column("p75", sa.Numeric(14, 2), nullable=False),
        sa.Column("avg", sa.Numeric(14, 2), nullable=False),
        sa.Column("computed_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("age_range", "geo_region", "category_name", "period", name="_benchmark_bucket_uc"),
    )

    # public_widgets (#64)
    op.create_table(
        "public_widgets",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("user_id", sa.String(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("token", sa.String(), nullable=False),
        sa.Column("type", sa.String(), nullable=False),
        sa.Column("config_json", sa.Text(), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("token", name="_public_widget_token_uc"),
    )
    op.create_index("ix_public_widgets_user_id", "public_widgets", ["user_id"])
    op.create_index("ix_public_widgets_token", "public_widgets", ["token"])


def downgrade() -> None:
    op.drop_index("ix_public_widgets_token", table_name="public_widgets")
    op.drop_index("ix_public_widgets_user_id", table_name="public_widgets")
    op.drop_table("public_widgets")
    op.drop_table("benchmark_aggregates")
    op.drop_table("user_streaks")
    op.drop_column("categories", "tax_deductible")
    op.drop_column("users", "geo_region")
    op.drop_column("users", "age_range")
    op.drop_column("users", "benchmark_opt_in")
    op.drop_column("users", "budget_mode")
