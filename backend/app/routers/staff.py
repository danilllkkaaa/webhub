from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.core.security import hash_password
from app.database import get_db
from app.models.project import Project
from app.models.project_member import ProjectMember
from app.models.user import User, UserRole
from app.schemas.staff import (
    ProjectMemberCreate,
    ProjectMemberOut,
    ProjectMemberUpdate,
    StaffCreate,
    StaffProjectAccessOut,
    StaffUpdate,
    StaffUserOut,
)
from app.services.access import get_project_for_user, is_org_owner, require_organization_id, require_project_permission

router = APIRouter(prefix="/admin/staff", tags=["staff"])


def _ensure_can_manage_staff(user: User) -> None:
    if not is_org_owner(user):
        raise HTTPException(status_code=403, detail="Only organization owner can manage all staff")


def _member_out(member: ProjectMember, user: User) -> ProjectMemberOut:
    return ProjectMemberOut(
        id=member.id,
        project_id=member.project_id,
        user_id=user.id,
        email=user.email,
        full_name=user.full_name,
        organization_role=user.role,
        role=member.role,
        is_active=user.is_active,
        created_at=member.created_at,
    )


async def _staff_user_out(user: User, db: AsyncSession) -> StaffUserOut:
    rows = await db.execute(
        select(ProjectMember, Project)
        .join(Project, ProjectMember.project_id == Project.id)
        .where(ProjectMember.user_id == user.id)
        .order_by(Project.name)
    )
    projects = [
        StaffProjectAccessOut(
            project_id=project.id,
            project_name=project.name,
            project_color=project.color,
            role=member.role,
            created_at=member.created_at,
        )
        for member, project in rows.all()
    ]
    return StaffUserOut(
        id=user.id,
        organization_id=user.organization_id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        is_active=user.is_active,
        created_at=user.created_at,
        projects=projects,
    )


async def _get_or_create_staff_user(
    data: StaffCreate | ProjectMemberCreate,
    organization_id: int,
    db: AsyncSession,
) -> User:
    result = await db.execute(select(User).where(User.email == str(data.email)))
    user = result.scalar_one_or_none()
    if user:
        if user.organization_id != organization_id:
            raise HTTPException(status_code=400, detail="User belongs to another organization")
        return user

    if not data.temp_password or len(data.temp_password) < 6:
        raise HTTPException(status_code=404, detail="User not found. Provide temp_password to create a new employee")

    user = User(
        organization_id=organization_id,
        email=str(data.email),
        full_name=data.full_name.strip() if data.full_name else None,
        hashed_password=hash_password(data.temp_password),
        role=data.organization_role,
        is_active=True,
    )
    db.add(user)
    await db.flush()
    return user


async def _upsert_project_member(
    project_id: int,
    staff_user: User,
    role,
    current_user: User,
    db: AsyncSession,
) -> ProjectMember:
    if staff_user.id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot add yourself as project employee")

    project = await get_project_for_user(project_id, current_user, db, permission="staff.manage")
    result = await db.execute(
        select(ProjectMember).where(
            ProjectMember.project_id == project.id,
            ProjectMember.user_id == staff_user.id,
        )
    )
    member = result.scalar_one_or_none()
    if member:
        member.role = role
        member.invited_by_id = current_user.id
        return member

    member = ProjectMember(
        organization_id=project.organization_id,
        project_id=project.id,
        user_id=staff_user.id,
        role=role,
        invited_by_id=current_user.id,
        note="shared_project_access",
    )
    db.add(member)
    return member


@router.get("/", response_model=list[StaffUserOut])
async def list_staff(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    organization_id = require_organization_id(current_user)
    _ensure_can_manage_staff(current_user)
    result = await db.execute(
        select(User)
        .where(User.organization_id == organization_id)
        .where(User.id != current_user.id)
        .order_by(User.created_at.desc())
    )
    return [await _staff_user_out(user, db) for user in result.scalars().all()]


@router.post("/", response_model=StaffUserOut, status_code=201)
async def create_staff_access(
    data: StaffCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    organization_id = require_organization_id(current_user)
    _ensure_can_manage_staff(current_user)
    staff_user = await _get_or_create_staff_user(data, organization_id, db)
    await _upsert_project_member(data.project_id, staff_user, data.project_role, current_user, db)
    if data.full_name and not staff_user.full_name:
        staff_user.full_name = data.full_name.strip()
    if staff_user.role == UserRole.owner:
        raise HTTPException(status_code=400, detail="Owner cannot be added as project employee")
    await db.commit()
    await db.refresh(staff_user)
    return await _staff_user_out(staff_user, db)


@router.get("/users/{user_id}", response_model=StaffUserOut)
async def get_staff_user(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    organization_id = require_organization_id(current_user)
    _ensure_can_manage_staff(current_user)
    result = await db.execute(select(User).where(User.id == user_id, User.organization_id == organization_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Staff user not found")
    return await _staff_user_out(user, db)


@router.patch("/users/{user_id}", response_model=StaffUserOut)
async def update_staff_user(
    user_id: int,
    data: StaffUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    organization_id = require_organization_id(current_user)
    _ensure_can_manage_staff(current_user)
    result = await db.execute(select(User).where(User.id == user_id, User.organization_id == organization_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Staff user not found")
    if user.role == UserRole.owner:
        raise HTTPException(status_code=400, detail="Owner cannot be changed here")
    if data.full_name is not None:
        user.full_name = data.full_name.strip() or None
    if data.organization_role is not None:
        if data.organization_role == UserRole.owner:
            raise HTTPException(status_code=400, detail="Cannot promote employee to owner")
        user.role = data.organization_role
    if data.is_active is not None:
        user.is_active = data.is_active
    await db.commit()
    await db.refresh(user)
    return await _staff_user_out(user, db)


@router.get("/projects/{project_id}/members", response_model=list[ProjectMemberOut])
async def list_project_members(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await require_project_permission(project_id, current_user, db, "staff.view")
    rows = await db.execute(
        select(ProjectMember, User)
        .join(User, ProjectMember.user_id == User.id)
        .where(ProjectMember.project_id == project_id)
        .order_by(ProjectMember.created_at.desc())
    )
    return [_member_out(member, user) for member, user in rows.all()]


@router.post("/projects/{project_id}/members", response_model=ProjectMemberOut, status_code=201)
async def add_project_member(
    project_id: int,
    data: ProjectMemberCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    organization_id = require_organization_id(current_user)
    await require_project_permission(project_id, current_user, db, "staff.manage")
    staff_user = await _get_or_create_staff_user(data, organization_id, db)
    if staff_user.role == UserRole.owner:
        raise HTTPException(status_code=400, detail="Owner cannot be added as project employee")
    member = await _upsert_project_member(project_id, staff_user, data.role, current_user, db)
    if data.full_name and not staff_user.full_name:
        staff_user.full_name = data.full_name.strip()
    await db.commit()
    await db.refresh(member)
    return _member_out(member, staff_user)


@router.patch("/projects/{project_id}/members/{user_id}", response_model=ProjectMemberOut)
async def update_project_member(
    project_id: int,
    user_id: int,
    data: ProjectMemberUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await require_project_permission(project_id, current_user, db, "staff.manage")
    row = (
        await db.execute(
            select(ProjectMember, User)
            .join(User, ProjectMember.user_id == User.id)
            .where(ProjectMember.project_id == project_id, ProjectMember.user_id == user_id)
        )
    ).first()
    if not row:
        raise HTTPException(status_code=404, detail="Project member not found")
    member, staff_user = row
    member.role = data.role
    member.invited_by_id = current_user.id
    await db.commit()
    await db.refresh(member)
    return _member_out(member, staff_user)


@router.delete("/projects/{project_id}/members/{user_id}", status_code=204)
async def remove_project_member(
    project_id: int,
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await require_project_permission(project_id, current_user, db, "staff.manage")
    result = await db.execute(
        select(ProjectMember).where(ProjectMember.project_id == project_id, ProjectMember.user_id == user_id)
    )
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="Project member not found")
    await db.delete(member)
    await db.commit()
