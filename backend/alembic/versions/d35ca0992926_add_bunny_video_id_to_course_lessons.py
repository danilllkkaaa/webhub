"""add bunny_video_id to course_lessons

Revision ID: d35ca0992926
Revises: 20260506_0006
Create Date: 2026-05-06 19:11:25.845553
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'd35ca0992926'
down_revision: Union[str, None] = '20260506_0006'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('course_lessons', sa.Column('bunny_video_id', sa.String(length=100), nullable=True))


def downgrade() -> None:
    op.drop_column('course_lessons', 'bunny_video_id')
