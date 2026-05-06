"""add project members

Revision ID: 20260506_0004
Revises: 20260506_0003
Create Date: 2026-05-06
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "20260506_0004"
down_revision: Union[str, None] = "20260506_0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

project_member_role = postgresql.ENUM(
    "project_admin",
    "content_manager",
    "webinar_moderator",
    "support",
    "analyst",
    name="projectmemberrole",
    create_type=False,
)


def upgrade() -> None:
    project_member_role.create(op.get_bind(), checkfirst=True)
    op.create_table(
        "project_members",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("organization_id", sa.Integer(), nullable=False),
        sa.Column("project_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("role", project_member_role, nullable=False),
        sa.Column("invited_by_id", sa.Integer(), nullable=True),
        sa.Column("note", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["invited_by_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("project_id", "user_id", name="uq_project_members_project_user"),
    )
    op.create_index(op.f("ix_project_members_organization_id"), "project_members", ["organization_id"], unique=False)
    op.create_index(op.f("ix_project_members_project_id"), "project_members", ["project_id"], unique=False)
    op.create_index(op.f("ix_project_members_user_id"), "project_members", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_project_members_user_id"), table_name="project_members")
    op.drop_index(op.f("ix_project_members_project_id"), table_name="project_members")
    op.drop_index(op.f("ix_project_members_organization_id"), table_name="project_members")
    op.drop_table("project_members")
    project_member_role.drop(op.get_bind(), checkfirst=True)
