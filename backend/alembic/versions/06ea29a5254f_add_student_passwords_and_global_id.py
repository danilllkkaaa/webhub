"""add_student_passwords_and_global_id

Revision ID: 06ea29a5254f
Revises: 46a9a2988a7f
Create Date: 2026-05-07
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '06ea29a5254f'
down_revision: Union[str, None] = '46a9a2988a7f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add hashed_password to CourseStudent to allow direct login
    op.add_column('course_students', sa.Column('hashed_password', sa.String(length=255), nullable=True))
    
    # 2. Add is_student flag to User model (though we currently use a separate table, 
    # it's cleaner to keep student info in CourseStudent but allow authentication)
    # We will use CourseStudent as the main entity for student login for now 
    # to avoid complex migrations of the User table which is for admins/staff.


def downgrade() -> None:
    op.drop_column('course_students', 'hashed_password')
