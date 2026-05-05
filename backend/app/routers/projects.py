from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.models.project import Project
from app.models.webinar import Webinar
from app.models.user import User
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectOut
from app.core.dependencies import get_current_user

router = APIRouter(prefix="/projects", tags=["projects"])


async def _owned(project_id: int, user: User, db: AsyncSession) -> Project:
    result = await db.execute(select(Project).where(Project.id == project_id, Project.owner_id == user.id))
    p = result.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    return p


@router.get("/", response_model=list[ProjectOut])
async def list_projects(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    rows = await db.execute(
        select(Project, func.count(Webinar.id).label("wc"))
        .outerjoin(Webinar, Webinar.project_id == Project.id)
        .where(Project.owner_id == current_user.id)
        .group_by(Project.id)
        .order_by(Project.created_at.desc())
    )
    return [
        ProjectOut(id=p.id, name=p.name, color=p.color, webinar_count=wc, created_at=p.created_at)
        for p, wc in rows.all()
    ]


@router.post("/", response_model=ProjectOut, status_code=201)
async def create_project(
    data: ProjectCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    project = Project(name=data.name.strip(), color=data.color, owner_id=current_user.id)
    db.add(project)
    await db.commit()
    await db.refresh(project)
    return ProjectOut(id=project.id, name=project.name, color=project.color, webinar_count=0, created_at=project.created_at)


@router.patch("/{project_id}", response_model=ProjectOut)
async def update_project(
    project_id: int,
    data: ProjectUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    project = await _owned(project_id, current_user, db)
    if data.name is not None:
        project.name = data.name.strip()
    if data.color is not None:
        project.color = data.color
    await db.commit()
    await db.refresh(project)

    count = await db.execute(
        select(func.count(Webinar.id)).where(Webinar.project_id == project.id)
    )
    return ProjectOut(id=project.id, name=project.name, color=project.color, webinar_count=count.scalar() or 0, created_at=project.created_at)


@router.delete("/{project_id}", status_code=204)
async def delete_project(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    project = await _owned(project_id, current_user, db)
    await db.delete(project)
    await db.commit()
