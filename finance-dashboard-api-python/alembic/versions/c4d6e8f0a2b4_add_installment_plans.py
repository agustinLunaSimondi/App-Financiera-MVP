"""add installment_plans table + installment columns on transactions

Revision ID: c4d6e8f0a2b4
Revises: a3f5c7d9e1b2
Create Date: 2026-07-24 01:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


revision: str = 'c4d6e8f0a2b4'
down_revision: Union[str, Sequence[str], None] = 'a3f5c7d9e1b2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE IF NOT EXISTS installment_plans (
            id VARCHAR PRIMARY KEY,
            user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            account_id VARCHAR NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
            category_id VARCHAR NOT NULL REFERENCES categories(id),
            description VARCHAR NOT NULL,
            principal_amount NUMERIC(12, 2) NOT NULL,
            num_installments INTEGER NOT NULL,
            monthly_interest_rate NUMERIC(6, 3) NOT NULL DEFAULT 0,
            start_date DATE NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
        )
    """)
    op.execute("ALTER TABLE installment_plans ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE transactions ADD COLUMN IF NOT EXISTS installment_plan_id VARCHAR REFERENCES installment_plans(id) ON DELETE SET NULL")
    op.execute("ALTER TABLE transactions ADD COLUMN IF NOT EXISTS installment_number INTEGER")


def downgrade() -> None:
    op.execute("ALTER TABLE transactions DROP COLUMN IF EXISTS installment_number")
    op.execute("ALTER TABLE transactions DROP COLUMN IF EXISTS installment_plan_id")
    op.execute("DROP TABLE IF EXISTS installment_plans")
