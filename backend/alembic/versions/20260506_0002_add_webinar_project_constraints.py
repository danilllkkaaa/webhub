"""add webinar project constraints

Revision ID: 20260506_0002
Revises: 20260506_0001
Create Date: 2026-05-06
"""
from typing import Sequence, Union

from alembic import op


revision: str = "20260506_0002"
down_revision: Union[str, None] = "20260506_0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE INDEX IF NOT EXISTS ix_webinars_project_id ON webinars (project_id)")
    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1
                FROM pg_constraint
                WHERE conname = 'fk_webinars_project_id_projects'
            ) THEN
                ALTER TABLE webinars
                ADD CONSTRAINT fk_webinars_project_id_projects
                FOREIGN KEY (project_id)
                REFERENCES projects(id)
                ON DELETE SET NULL;
            END IF;
        END $$;
        """
    )


def downgrade() -> None:
    op.execute("ALTER TABLE webinars DROP CONSTRAINT IF EXISTS fk_webinars_project_id_projects")
    op.execute("DROP INDEX IF EXISTS ix_webinars_project_id")
