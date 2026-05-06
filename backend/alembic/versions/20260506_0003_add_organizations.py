"""add organizations

Revision ID: 20260506_0003
Revises: 20260506_0002
Create Date: 2026-05-06
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260506_0003"
down_revision: Union[str, None] = "20260506_0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

user_role = sa.Enum("owner", "admin", "manager", name="userrole")


def upgrade() -> None:
    user_role.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "organizations",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )

    op.add_column("users", sa.Column("organization_id", sa.Integer(), nullable=True))
    op.add_column("users", sa.Column("role", user_role, server_default="owner", nullable=False))
    op.create_index(op.f("ix_users_organization_id"), "users", ["organization_id"], unique=False)
    op.create_foreign_key("fk_users_organization_id_organizations", "users", "organizations", ["organization_id"], ["id"], ondelete="SET NULL")

    op.add_column("projects", sa.Column("organization_id", sa.Integer(), nullable=True))
    op.create_index(op.f("ix_projects_organization_id"), "projects", ["organization_id"], unique=False)
    op.create_foreign_key("fk_projects_organization_id_organizations", "projects", "organizations", ["organization_id"], ["id"], ondelete="CASCADE")

    op.add_column("webinars", sa.Column("organization_id", sa.Integer(), nullable=True))
    op.create_index(op.f("ix_webinars_organization_id"), "webinars", ["organization_id"], unique=False)
    op.create_foreign_key("fk_webinars_organization_id_organizations", "webinars", "organizations", ["organization_id"], ["id"], ondelete="SET NULL")

    op.add_column("courses", sa.Column("organization_id", sa.Integer(), nullable=True))
    op.create_index(op.f("ix_courses_organization_id"), "courses", ["organization_id"], unique=False)
    op.create_foreign_key("fk_courses_organization_id_organizations", "courses", "organizations", ["organization_id"], ["id"], ondelete="SET NULL")

    op.execute("INSERT INTO organizations (name, created_at) VALUES ('Default school', NOW())")
    op.execute("UPDATE users SET organization_id = (SELECT id FROM organizations ORDER BY id LIMIT 1) WHERE organization_id IS NULL")
    op.execute("UPDATE projects SET organization_id = (SELECT organization_id FROM users WHERE users.id = projects.owner_id) WHERE organization_id IS NULL")
    op.execute(
        """
        UPDATE webinars
        SET organization_id = projects.organization_id
        FROM projects
        WHERE webinars.project_id = projects.id AND webinars.organization_id IS NULL
        """
    )
    op.execute(
        """
        UPDATE courses
        SET organization_id = projects.organization_id
        FROM projects
        WHERE courses.project_id = projects.id AND courses.organization_id IS NULL
        """
    )
    op.execute("UPDATE webinars SET organization_id = (SELECT id FROM organizations ORDER BY id LIMIT 1) WHERE organization_id IS NULL")
    op.execute("UPDATE courses SET organization_id = (SELECT id FROM organizations ORDER BY id LIMIT 1) WHERE organization_id IS NULL")

    op.alter_column("projects", "organization_id", existing_type=sa.Integer(), nullable=False)
    op.alter_column("users", "role", server_default=None)


def downgrade() -> None:
    op.drop_constraint("fk_courses_organization_id_organizations", "courses", type_="foreignkey")
    op.drop_index(op.f("ix_courses_organization_id"), table_name="courses")
    op.drop_column("courses", "organization_id")

    op.drop_constraint("fk_webinars_organization_id_organizations", "webinars", type_="foreignkey")
    op.drop_index(op.f("ix_webinars_organization_id"), table_name="webinars")
    op.drop_column("webinars", "organization_id")

    op.drop_constraint("fk_projects_organization_id_organizations", "projects", type_="foreignkey")
    op.drop_index(op.f("ix_projects_organization_id"), table_name="projects")
    op.drop_column("projects", "organization_id")

    op.drop_constraint("fk_users_organization_id_organizations", "users", type_="foreignkey")
    op.drop_index(op.f("ix_users_organization_id"), table_name="users")
    op.drop_column("users", "role")
    op.drop_column("users", "organization_id")

    op.drop_table("organizations")
    user_role.drop(op.get_bind(), checkfirst=True)
