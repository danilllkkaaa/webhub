"""add student accounts

Revision ID: 20260506_0006
Revises: 20260506_0005
Create Date: 2026-05-06
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260506_0006"
down_revision: Union[str, None] = "20260506_0005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'student'")
    op.add_column("course_students", sa.Column("user_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_course_students_user_id_users",
        "course_students",
        "users",
        ["user_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index(op.f("ix_course_students_user_id"), "course_students", ["user_id"], unique=False)
    op.create_unique_constraint("uq_course_students_course_user", "course_students", ["course_id", "user_id"])


def downgrade() -> None:
    op.drop_constraint("uq_course_students_course_user", "course_students", type_="unique")
    op.drop_index(op.f("ix_course_students_user_id"), table_name="course_students")
    op.drop_constraint("fk_course_students_user_id_users", "course_students", type_="foreignkey")
    op.drop_column("course_students", "user_id")
