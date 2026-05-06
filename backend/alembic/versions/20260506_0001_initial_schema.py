"""initial schema

Revision ID: 20260506_0001
Revises:
Create Date: 2026-05-06
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260506_0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

webinar_type = sa.Enum("live", "auto", name="webinartype")
webinar_status = sa.Enum("draft", "scheduled", "live", "finished", name="webinarstatus")
event_type = sa.Enum(
    "chat_message",
    "offer_show",
    "offer_hide",
    "banner_show",
    "banner_hide",
    "redirect",
    name="eventtype",
)
course_status = sa.Enum("draft", "published", "archived", name="coursestatus")
lesson_type = sa.Enum("video", "text", name="lessontype")


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("hashed_password", sa.String(length=255), nullable=False),
        sa.Column("full_name", sa.String(length=255), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)

    op.create_table(
        "projects",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("color", sa.String(length=7), nullable=False),
        sa.Column("owner_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_projects_owner_id"), "projects", ["owner_id"], unique=False)

    op.create_table(
        "courses",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("project_id", sa.Integer(), nullable=True),
        sa.Column("slug", sa.String(length=255), nullable=False),
        sa.Column("invite_token", sa.String(length=64), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("cover_url", sa.String(length=500), nullable=True),
        sa.Column("status", course_status, nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_courses_invite_token"), "courses", ["invite_token"], unique=True)
    op.create_index(op.f("ix_courses_project_id"), "courses", ["project_id"], unique=False)
    op.create_index(op.f("ix_courses_slug"), "courses", ["slug"], unique=True)

    op.create_table(
        "webinars",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("slug", sa.String(length=255), nullable=False),
        sa.Column("invite_token", sa.String(length=64), nullable=True),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("webinar_type", webinar_type, nullable=False),
        sa.Column("status", webinar_status, nullable=False),
        sa.Column("youtube_url", sa.String(length=500), nullable=True),
        sa.Column("video_id", sa.String(length=50), nullable=True),
        sa.Column("scheduled_at", sa.DateTime(), nullable=True),
        sa.Column("duration_minutes", sa.Integer(), nullable=True),
        sa.Column("offer_text", sa.String(length=500), nullable=True),
        sa.Column("offer_url", sa.String(length=500), nullable=True),
        sa.Column("offer_button_text", sa.String(length=100), nullable=True),
        sa.Column("chat_enabled", sa.Boolean(), nullable=False),
        sa.Column("project_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_webinars_invite_token"), "webinars", ["invite_token"], unique=True)
    op.create_index(op.f("ix_webinars_slug"), "webinars", ["slug"], unique=True)

    op.create_table(
        "course_modules",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("course_id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("is_published", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["course_id"], ["courses.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_course_modules_course_id"), "course_modules", ["course_id"], unique=False)

    op.create_table(
        "course_students",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("course_id", sa.Integer(), nullable=False),
        sa.Column("token", sa.String(length=64), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("phone", sa.String(length=50), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("telegram", sa.String(length=100), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("last_seen_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["course_id"], ["courses.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_course_students_course_id"), "course_students", ["course_id"], unique=False)
    op.create_index(op.f("ix_course_students_token"), "course_students", ["token"], unique=True)

    op.create_table(
        "registrations",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("webinar_id", sa.Integer(), nullable=False),
        sa.Column("token", sa.String(length=64), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("phone", sa.String(length=50), nullable=True),
        sa.Column("email", sa.String(length=255), nullable=True),
        sa.Column("telegram", sa.String(length=100), nullable=True),
        sa.Column("utm_source", sa.String(length=100), nullable=True),
        sa.Column("utm_medium", sa.String(length=100), nullable=True),
        sa.Column("utm_campaign", sa.String(length=100), nullable=True),
        sa.Column("utm_term", sa.String(length=100), nullable=True),
        sa.Column("utm_content", sa.String(length=100), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["webinar_id"], ["webinars.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_registrations_token"), "registrations", ["token"], unique=True)
    op.create_index(op.f("ix_registrations_webinar_id"), "registrations", ["webinar_id"], unique=False)

    op.create_table(
        "timeline_events",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("webinar_id", sa.Integer(), nullable=False),
        sa.Column("event_type", event_type, nullable=False),
        sa.Column("offset_seconds", sa.Integer(), nullable=False),
        sa.Column("payload", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["webinar_id"], ["webinars.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_timeline_events_webinar_id"), "timeline_events", ["webinar_id"], unique=False)

    op.create_table(
        "chat_messages",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("webinar_id", sa.Integer(), nullable=False),
        sa.Column("registration_id", sa.Integer(), nullable=True),
        sa.Column("author_name", sa.String(length=255), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("is_scripted", sa.Boolean(), nullable=False),
        sa.Column("offset_seconds", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["registration_id"], ["registrations.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["webinar_id"], ["webinars.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_chat_messages_webinar_id"), "chat_messages", ["webinar_id"], unique=False)

    op.create_table(
        "course_lessons",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("module_id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("lesson_type", lesson_type, nullable=False),
        sa.Column("video_url", sa.String(length=500), nullable=True),
        sa.Column("video_id", sa.String(length=50), nullable=True),
        sa.Column("content", sa.Text(), nullable=True),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("is_published", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["module_id"], ["course_modules.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_course_lessons_module_id"), "course_lessons", ["module_id"], unique=False)

    op.create_table(
        "offer_clicks",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("webinar_id", sa.Integer(), nullable=False),
        sa.Column("registration_id", sa.Integer(), nullable=True),
        sa.Column("clicked_at", sa.DateTime(), nullable=False),
        sa.Column("ip_address", sa.String(length=45), nullable=True),
        sa.ForeignKeyConstraint(["registration_id"], ["registrations.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["webinar_id"], ["webinars.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_offer_clicks_webinar_id"), "offer_clicks", ["webinar_id"], unique=False)

    op.create_table(
        "viewer_sessions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("registration_id", sa.Integer(), nullable=False),
        sa.Column("webinar_id", sa.Integer(), nullable=False),
        sa.Column("entered_at", sa.DateTime(), nullable=False),
        sa.Column("last_ping_at", sa.DateTime(), nullable=True),
        sa.Column("exited_at", sa.DateTime(), nullable=True),
        sa.Column("watch_seconds", sa.Integer(), nullable=False),
        sa.Column("ip_address", sa.String(length=45), nullable=True),
        sa.Column("user_agent", sa.String(length=500), nullable=True),
        sa.ForeignKeyConstraint(["registration_id"], ["registrations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["webinar_id"], ["webinars.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_viewer_sessions_registration_id"), "viewer_sessions", ["registration_id"], unique=False)
    op.create_index(op.f("ix_viewer_sessions_webinar_id"), "viewer_sessions", ["webinar_id"], unique=False)

    op.create_table(
        "course_lesson_progress",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("student_id", sa.Integer(), nullable=False),
        sa.Column("lesson_id", sa.Integer(), nullable=False),
        sa.Column("completed_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["lesson_id"], ["course_lessons.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["student_id"], ["course_students.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_course_lesson_progress_lesson_id"), "course_lesson_progress", ["lesson_id"], unique=False)
    op.create_index(op.f("ix_course_lesson_progress_student_id"), "course_lesson_progress", ["student_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_course_lesson_progress_student_id"), table_name="course_lesson_progress")
    op.drop_index(op.f("ix_course_lesson_progress_lesson_id"), table_name="course_lesson_progress")
    op.drop_table("course_lesson_progress")
    op.drop_index(op.f("ix_viewer_sessions_webinar_id"), table_name="viewer_sessions")
    op.drop_index(op.f("ix_viewer_sessions_registration_id"), table_name="viewer_sessions")
    op.drop_table("viewer_sessions")
    op.drop_index(op.f("ix_offer_clicks_webinar_id"), table_name="offer_clicks")
    op.drop_table("offer_clicks")
    op.drop_index(op.f("ix_course_lessons_module_id"), table_name="course_lessons")
    op.drop_table("course_lessons")
    op.drop_index(op.f("ix_chat_messages_webinar_id"), table_name="chat_messages")
    op.drop_table("chat_messages")
    op.drop_index(op.f("ix_timeline_events_webinar_id"), table_name="timeline_events")
    op.drop_table("timeline_events")
    op.drop_index(op.f("ix_registrations_webinar_id"), table_name="registrations")
    op.drop_index(op.f("ix_registrations_token"), table_name="registrations")
    op.drop_table("registrations")
    op.drop_index(op.f("ix_course_students_token"), table_name="course_students")
    op.drop_index(op.f("ix_course_students_course_id"), table_name="course_students")
    op.drop_table("course_students")
    op.drop_index(op.f("ix_course_modules_course_id"), table_name="course_modules")
    op.drop_table("course_modules")
    op.drop_index(op.f("ix_webinars_slug"), table_name="webinars")
    op.drop_index(op.f("ix_webinars_invite_token"), table_name="webinars")
    op.drop_table("webinars")
    op.drop_index(op.f("ix_courses_slug"), table_name="courses")
    op.drop_index(op.f("ix_courses_project_id"), table_name="courses")
    op.drop_index(op.f("ix_courses_invite_token"), table_name="courses")
    op.drop_table("courses")
    op.drop_index(op.f("ix_projects_owner_id"), table_name="projects")
    op.drop_table("projects")
    op.drop_index(op.f("ix_users_email"), table_name="users")
    op.drop_table("users")
    lesson_type.drop(op.get_bind(), checkfirst=True)
    course_status.drop(op.get_bind(), checkfirst=True)
    event_type.drop(op.get_bind(), checkfirst=True)
    webinar_status.drop(op.get_bind(), checkfirst=True)
    webinar_type.drop(op.get_bind(), checkfirst=True)
