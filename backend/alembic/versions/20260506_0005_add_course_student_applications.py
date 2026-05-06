"""add course student applications

Revision ID: 20260506_0005
Revises: 20260506_0004
Create Date: 2026-05-06
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "20260506_0005"
down_revision: Union[str, None] = "20260506_0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

course_student_status = postgresql.ENUM(
    "pending",
    "approved",
    "rejected",
    name="coursestudentstatus",
    create_type=False,
)


def upgrade() -> None:
    course_student_status.create(op.get_bind(), checkfirst=True)
    op.add_column(
        "course_students",
        sa.Column("status", course_student_status, nullable=False, server_default="pending"),
    )
    op.add_column("course_students", sa.Column("status_note", sa.Text(), nullable=True))
    op.add_column("course_students", sa.Column("reviewed_at", sa.DateTime(), nullable=True))
    op.create_index(op.f("ix_course_students_status"), "course_students", ["status"], unique=False)
    op.execute("UPDATE course_students SET status = 'approved' WHERE status = 'pending'")
    op.alter_column("course_students", "status", server_default=None)


def downgrade() -> None:
    op.drop_index(op.f("ix_course_students_status"), table_name="course_students")
    op.drop_column("course_students", "reviewed_at")
    op.drop_column("course_students", "status_note")
    op.drop_column("course_students", "status")
    course_student_status.drop(op.get_bind(), checkfirst=True)
