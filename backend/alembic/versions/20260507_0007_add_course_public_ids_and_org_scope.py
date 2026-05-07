"""add course public ids and organization scope

Revision ID: 20260507_0007
Revises: 06ea29a5254f
Create Date: 2026-05-07
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260507_0007"
down_revision: Union[str, None] = "06ea29a5254f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("courses", sa.Column("public_id", sa.String(length=6), nullable=True))
    op.create_index(op.f("ix_courses_public_id"), "courses", ["public_id"], unique=True)

    op.execute(
        """
        UPDATE courses
        SET organization_id = projects.organization_id
        FROM projects
        WHERE courses.project_id = projects.id
          AND courses.organization_id IS NULL
        """
    )

    op.execute(
        """
        DO $$
        DECLARE
            course_row RECORD;
            candidate TEXT;
        BEGIN
            FOR course_row IN SELECT id FROM courses WHERE public_id IS NULL LOOP
                LOOP
                    candidate := LPAD((FLOOR(RANDOM() * 900000)::INT + 100000)::TEXT, 6, '0');
                    EXIT WHEN NOT EXISTS (
                        SELECT 1 FROM courses WHERE public_id = candidate
                    );
                END LOOP;

                UPDATE courses SET public_id = candidate WHERE id = course_row.id;
            END LOOP;
        END $$;
        """
    )

    op.alter_column("courses", "public_id", nullable=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_courses_public_id"), table_name="courses")
    op.drop_column("courses", "public_id")
