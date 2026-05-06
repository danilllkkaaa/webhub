from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.models.project import Project
from app.models.webinar import Webinar
from app.models.course import Course
from app.models.project_member import ProjectMember
from app.models.user import User
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectOut
from app.core.dependencies import get_current_user
from app.services.access import accessible_project_ids, get_project_for_user, is_org_owner, require_organization_id

router = APIRouter(prefix="/projects", tags=["projects"])


@router.get("/", response_model=list[ProjectOut])
async def list_projects(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    organization_id = require_organization_id(current_user)
    query = (
        select(Project, func.count(Webinar.id).label("wc"))
        .outerjoin(Webinar, Webinar.project_id == Project.id)
        .where(Project.organization_id == organization_id)
        .group_by(Project.id)
        .order_by(Project.created_at.desc())
    )
    allowed_ids = await accessible_project_ids(current_user, db)
    if allowed_ids is not None:
        if not allowed_ids:
            return []
        query = query.where(Project.id.in_(allowed_ids))
    rows = await db.execute(query)

    memberships: dict[int, ProjectMember] = {}
    if not is_org_owner(current_user):
        member_rows = await db.execute(
            select(ProjectMember).where(
                ProjectMember.organization_id == organization_id,
                ProjectMember.user_id == current_user.id,
            )
        )
        memberships = {member.project_id: member for member in member_rows.scalars().all()}

    out = []
    for project, webinar_count in rows.all():
        member = memberships.get(project.id)
        out.append(
            ProjectOut(
                id=project.id,
                organization_id=project.organization_id,
                name=project.name,
                color=project.color,
                webinar_count=webinar_count,
                access_type="owner" if is_org_owner(current_user) else "shared",
                member_role=member.role.value if member else None,
                created_at=project.created_at,
            )
        )
    return out


@router.post("/", response_model=ProjectOut, status_code=201)
async def create_project(
    data: ProjectCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    organization_id = require_organization_id(current_user)
    if not is_org_owner(current_user):
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Only organization owner can create projects")
    project = Project(
        name=data.name.strip(),
        color=data.color,
        owner_id=current_user.id,
        organization_id=organization_id,
    )
    db.add(project)
    await db.commit()
    await db.refresh(project)
    return ProjectOut(id=project.id, organization_id=project.organization_id, name=project.name, color=project.color, webinar_count=0, created_at=project.created_at)


@router.patch("/{project_id}", response_model=ProjectOut)
async def update_project(
    project_id: int,
    data: ProjectUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    project = await get_project_for_user(project_id, current_user, db, permission="project.update")
    if data.name is not None:
        project.name = data.name.strip()
    if data.color is not None:
        project.color = data.color
    await db.commit()
    await db.refresh(project)

    count = await db.execute(
        select(func.count(Webinar.id)).where(Webinar.project_id == project.id)
    )
    return ProjectOut(id=project.id, organization_id=project.organization_id, name=project.name, color=project.color, webinar_count=count.scalar() or 0, created_at=project.created_at)


@router.delete("/{project_id}", status_code=204)
async def delete_project(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not is_org_owner(current_user):
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Only organization owner can delete projects")
    project = await get_project_for_user(project_id, current_user, db, permission="project.update")
    await db.execute(
        Webinar.__table__.update()
        .where(Webinar.project_id == project.id)
        .values(project_id=None)
    )
    await db.execute(
        Course.__table__.update()
        .where(Course.project_id == project.id)
        .values(project_id=None)
    )
    await db.delete(project)
    await db.commit()
