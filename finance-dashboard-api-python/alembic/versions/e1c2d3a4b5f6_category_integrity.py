"""category integrity: category_id ondelete + source column

Revision ID: e1c2d3a4b5f6
Revises: a2b3c4d5e6f7
Create Date: 2026-05-22

- Transaction.category_id pasa a ON DELETE RESTRICT (antes: no constraint sobre delete).
- Añadimos índices que faltaban en columnas de búsqueda frecuente.
"""
from alembic import op
import sqlalchemy as sa

revision = "e1c2d3a4b5f6"
down_revision = "a2b3c4d5e6f7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Postgres no permite cambiar ON DELETE inline; hay que dropear y recrear la FK.
    with op.batch_alter_table("transactions") as batch:
        batch.drop_constraint("transactions_category_id_fkey", type_="foreignkey")
        batch.create_foreign_key(
            "transactions_category_id_fkey",
            "categories",
            ["category_id"],
            ["id"],
            ondelete="RESTRICT",
        )

    # Índices útiles para queries de analytics y filtros.
    op.create_index("ix_transactions_account_id", "transactions", ["account_id"])
    op.create_index("ix_transactions_category_id", "transactions", ["category_id"])
    op.create_index("ix_transactions_transaction_date", "transactions", ["transaction_date"])
    op.create_index("ix_accounts_user_id", "accounts", ["user_id"])
    op.create_index("ix_categories_user_id", "categories", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_categories_user_id", table_name="categories")
    op.drop_index("ix_accounts_user_id", table_name="accounts")
    op.drop_index("ix_transactions_transaction_date", table_name="transactions")
    op.drop_index("ix_transactions_category_id", table_name="transactions")
    op.drop_index("ix_transactions_account_id", table_name="transactions")

    with op.batch_alter_table("transactions") as batch:
        batch.drop_constraint("transactions_category_id_fkey", type_="foreignkey")
        batch.create_foreign_key(
            "transactions_category_id_fkey",
            "categories",
            ["category_id"],
            ["id"],
        )
