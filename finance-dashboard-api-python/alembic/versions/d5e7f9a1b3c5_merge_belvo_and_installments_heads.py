"""merge belvo and installments heads

Revision ID: d5e7f9a1b3c5
Revises: a1b2c3d4e5f6, c4d6e8f0a2b4
Create Date: 2026-07-24 15:00:00.000000

Ambos branches divergieron en e2f3a4b5c6d7. a1b2c3d4e5f6 (belvo_connections)
nunca se había aplicado contra la DB compartida — este merge lo trae junto
con la cadena de forgot-password/installments, dejando un solo head.
"""
from typing import Sequence, Union

revision: str = 'd5e7f9a1b3c5'
down_revision: Union[str, Sequence[str], None] = ('a1b2c3d4e5f6', 'c4d6e8f0a2b4')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
