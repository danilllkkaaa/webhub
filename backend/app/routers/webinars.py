from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from slugify import slugify

from app.database import get_db
from app.models.user import User
from app.models.webinar import Webinar
from app.schemas.webinar import WebinarCreate, WebinarUpdate, WebinarOut
from app.core.dependencies import get_current_user
from app.core.youtube import extract_video_id
from app.core.security import generate_viewer_token

router = APIRouter(prefix="/webinars", tags=["webinars"])


async def _unique_slug(title: str, db: AsyncSession) -> str:
    base = slugify(title)
    slug = base
    i = 1
    while True:
        result = await db.execute(select(Webinar).where(Webinar.slug == slug))
        if not result.scalar_one_or_none():
            return slug
        slug = f"{base}-{i}"
        i += 1


@router.get("/", response_model=list[WebinarOut])
async def list_webinars(
    project_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = select(Webinar)
    if project_id is not None:
        q = q.where(Webinar.project_id == project_id)
    result = await db.execute(q.order_by(Webinar.created_at.desc()))
    return result.scalars().all()


@router.post("/", response_model=WebinarOut, status_code=201)
async def create_webinar(
    data: WebinarCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    slug = await _unique_slug(data.title, db)
    video_id = extract_video_id(data.youtube_url) if data.youtube_url else None
    webinar = Webinar(
        slug=slug,
        invite_token=generate_viewer_token(),
        video_id=video_id,
        **data.model_dump(),
    )
    db.add(webinar)
    await db.commit()
    await db.refresh(webinar)
    return webinar


@router.get("/{webinar_id}", response_model=WebinarOut)
async def get_webinar(
    webinar_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(Webinar).where(Webinar.id == webinar_id))
    webinar = result.scalar_one_or_none()
    if not webinar:
        raise HTTPException(status_code=404, detail="Webinar not found")
    return webinar


@router.patch("/{webinar_id}", response_model=WebinarOut)
async def update_webinar(
    webinar_id: int,
    data: WebinarUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(Webinar).where(Webinar.id == webinar_id))
    webinar = result.scalar_one_or_none()
    if not webinar:
        raise HTTPException(status_code=404, detail="Webinar not found")
    update_data = data.model_dump(exclude_unset=True)
    if "youtube_url" in update_data:
        update_data["video_id"] = extract_video_id(update_data["youtube_url"]) if update_data["youtube_url"] else None
    for field, value in update_data.items():
        setattr(webinar, field, value)
    await db.commit()
    await db.refresh(webinar)
    return webinar


@router.delete("/{webinar_id}", status_code=204)
async def delete_webinar(
    webinar_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(Webinar).where(Webinar.id == webinar_id))
    webinar = result.scalar_one_or_none()
    if not webinar:
        raise HTTPException(status_code=404, detail="Webinar not found")
    await db.delete(webinar)
    await db.commit()
