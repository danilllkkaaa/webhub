from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.course import Course, CourseLesson, CourseModule
from app.models.project import Project
from app.models.project_member import ProjectMember, ProjectMemberRole
from app.models.user import User, UserRole
from app.models.webinar import Webinar


ROLE_PERMISSIONS: dict[ProjectMemberRole, set[str]] = {
    ProjectMemberRole.project_admin: {
        "project.view", "project.update",
        "staff.view", "staff.manage",
        "webinar.view", "webinar.create", "webinar.update", "webinar.delete",
        "webinar.broadcast", "webinar.chat_moderate", "webinar.analytics", "webinar.export",
        "course.view", "course.create", "course.update", "course.delete", "course.students", "course.export",
    },
    ProjectMemberRole.content_manager: {
        "project.view",
        "webinar.view", "webinar.create", "webinar.update", "webinar.analytics",
        "course.view", "course.create", "course.update", "course.students",
    },
    ProjectMemberRole.webinar_moderator: {
        "project.view",
        "webinar.view", "webinar.broadcast", "webinar.chat_moderate", "webinar.analytics",
    },
    ProjectMemberRole.support: {
        "project.view",
        "webinar.view", "webinar.chat_moderate", "webinar.analytics", "webinar.export",
        "course.view", "course.students", "course.export",
    },
    ProjectMemberRole.analyst: {
        "project.view",
        "webinar.view", "webinar.analytics", "webinar.export",
        "course.view", "course.students", "course.export",
    },
}


def require_organization_id(user: User) -> int:
    if user.organization_id is None:
        raise HTTPException(status_code=403, detail="User is not attached to an organization")
    return user.organization_id


def is_org_owner(user: User) -> bool:
    return user.role == UserRole.owner


async def get_project_membership(project_id: int, user: User, db: AsyncSession) -> ProjectMember | None:
    organization_id = require_organization_id(user)
    result = await db.execute(
        select(ProjectMember).where(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == user.id,
            ProjectMember.organization_id == organization_id,
        )
    )
    return result.scalar_one_or_none()


async def has_project_permission(project_id: int, user: User, db: AsyncSession, permission: str) -> bool:
    if is_org_owner(user):
        return True
    member = await get_project_membership(project_id, user, db)
    if not member:
        return False
    permissions = ROLE_PERMISSIONS.get(member.role, set())
    return permission in permissions


async def require_project_permission(project_id: int, user: User, db: AsyncSession, permission: str) -> ProjectMember | None:
    if is_org_owner(user):
        return None
    member = await get_project_membership(project_id, user, db)
    if not member:
        raise HTTPException(status_code=404, detail="Project not found")
    if permission not in ROLE_PERMISSIONS.get(member.role, set()):
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return member


async def accessible_project_ids(user: User, db: AsyncSession) -> list[int] | None:
    organization_id = require_organization_id(user)
    if is_org_owner(user):
        return None
    result = await db.execute(
        select(ProjectMember.project_id).where(
            ProjectMember.organization_id == organization_id,
            ProjectMember.user_id == user.id,
        )
    )
    return list(result.scalars().all())


async def get_project_for_user(project_id: int, user: User, db: AsyncSession, permission: str = "project.view") -> Project:
    organization_id = require_organization_id(user)
    result = await db.execute(
        select(Project).where(
            Project.id == project_id,
            Project.organization_id == organization_id,
        )
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    await require_project_permission(project_id, user, db, permission)
    return project


async def optional_project_id_for_user(project_id: int | None, user: User, db: AsyncSession, permission: str = "project.view") -> int | None:
    if project_id is None:
        return None
    await get_project_for_user(project_id, user, db, permission)
    return project_id


async def _require_entity_project(project_id: int | None, user: User, db: AsyncSession, permission: str) -> None:
    if project_id is None:
        if not is_org_owner(user):
            raise HTTPException(status_code=404, detail="Project not found")
        return
    await require_project_permission(project_id, user, db, permission)


async def get_webinar_for_user(webinar_id: int, user: User, db: AsyncSession, permission: str = "webinar.view") -> Webinar:
    organization_id = require_organization_id(user)
    result = await db.execute(
        select(Webinar).where(
            Webinar.id == webinar_id,
            Webinar.organization_id == organization_id,
        )
    )
    webinar = result.scalar_one_or_none()
    if not webinar:
        raise HTTPException(status_code=404, detail="Webinar not found")
    await _require_entity_project(webinar.project_id, user, db, permission)
    return webinar


async def get_course_for_user(course_id: int, user: User, db: AsyncSession, permission: str = "course.view") -> Course:
    organization_id = require_organization_id(user)
    result = await db.execute(
        select(Course).where(
            Course.id == course_id,
            Course.organization_id == organization_id,
        )
    )
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    await _require_entity_project(course.project_id, user, db, permission)
    return course


async def get_course_module_for_user(module_id: int, user: User, db: AsyncSession, permission: str = "course.update") -> CourseModule:
    organization_id = require_organization_id(user)
    row = (
        await db.execute(
            select(CourseModule, Course)
            .join(Course, CourseModule.course_id == Course.id)
            .where(CourseModule.id == module_id)
            .where(Course.organization_id == organization_id)
        )
    ).first()
    if not row:
        raise HTTPException(status_code=404, detail="Module not found")
    module, course = row
    await _require_entity_project(course.project_id, user, db, permission)
    return module


async def get_course_lesson_for_user(lesson_id: int, user: User, db: AsyncSession, permission: str = "course.update") -> CourseLesson:
    organization_id = require_organization_id(user)
    row = (
        await db.execute(
            select(CourseLesson, Course)
            .join(CourseModule, CourseLesson.module_id == CourseModule.id)
            .join(Course, CourseModule.course_id == Course.id)
            .where(CourseLesson.id == lesson_id)
            .where(Course.organization_id == organization_id)
        )
    ).first()
    if not row:
        raise HTTPException(status_code=404, detail="Lesson not found")
    lesson, course = row
    await _require_entity_project(course.project_id, user, db, permission)
    return lesson
