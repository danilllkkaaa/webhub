"""add_mixed_to_lessontype_enum

Revision ID: 46a9a2988a7f
Revises: 11e0b07e95fd
Create Date: 2026-05-07
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '46a9a2988a7f'
down_revision: Union[str, None] = '11e0b07e95fd'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Use execute with direct SQL because ALTER TYPE cannot run in a transaction in some Postgres versions,
    # but Alembic usually handles this or we can use commit_as_batch if needed.
    # For enum addition, this is the most compatible way for Postgres.
    op.execute("ALTER TYPE lessontype ADD VALUE 'mixed'")


def downgrade() -> None:
    # Downgrading enums in Postgres is complex (requires dropping and recreating).
    # Usually, we don't remove values unless absolutely necessary.
    pass
