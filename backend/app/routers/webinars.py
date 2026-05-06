from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from slugify import slugify

from app.database import get_db
from app.models.user import User
from app.models.webinar import Webinar, WebinarType, WebinarStatus
from app.models.chat_message import ChatMessage
from app.models.timeline_event import TimelineEvent, EventType
from app.schemas.webinar import WebinarCreate, WebinarUpdate, WebinarOut
from app.core.dependencies import get_current_user
from app.core.youtube import extract_video_id
from app.core.security import generate_viewer_token
from app.websocket.manager import manager


class ScenarioCreate(BaseModel):
    youtube_url: Optional[str] = None

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
    was_finished = update_data.get("status") == WebinarStatus.finished
    for field, value in update_data.items():
        setattr(webinar, field, value)
    await db.commit()
    await db.refresh(webinar)
    if was_finished:
        await manager.broadcast(webinar_id, {"type": "webinar_ended"})
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


@router.post("/{webinar_id}/create-scenario", response_model=WebinarOut, status_code=201)
async def create_scenario(
    webinar_id: int,
    data: ScenarioCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(Webinar).where(Webinar.id == webinar_id))
    original = result.scalar_one_or_none()
    if not original:
        raise HTTPException(status_code=404, detail="Webinar not found")
    if original.status != WebinarStatus.finished:
        raise HTTPException(status_code=400, detail="Webinar must be finished to create a scenario")

    msgs_result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.webinar_id == webinar_id, ChatMessage.is_scripted == False)
        .order_by(ChatMessage.created_at)
    )
    messages = msgs_result.scalars().all()

    ref_time = original.scheduled_at
    if ref_time is None and messages:
        ref_time = messages[0].created_at

    recording_video_id = extract_video_id(data.youtube_url) if data.youtube_url else None
    slug = await _unique_slug(f"{original.title}-scenarij", db)
    new_webinar = Webinar(
        slug=slug,
        invite_token=generate_viewer_token(),
        title=f"{original.title} [Сценарий]",
        description=original.description,
        webinar_type=WebinarType.auto,
        status=WebinarStatus.draft,
        video_id=recording_video_id,
        youtube_url=data.youtube_url,
        scheduled_at=original.scheduled_at,
        duration_minutes=original.duration_minutes,
        offer_text=original.offer_text,
        offer_url=original.offer_url,
        offer_button_text=original.offer_button_text,
        chat_enabled=original.chat_enabled,
        project_id=original.project_id,
    )
    db.add(new_webinar)
    await db.flush()

    if ref_time and messages:
        for msg in messages:
            offset = max(0, round((msg.created_at - ref_time).total_seconds()))
            db.add(TimelineEvent(
                webinar_id=new_webinar.id,
                event_type=EventType.chat_message,
                offset_seconds=offset,
                payload=msg.text,
            ))

    await db.commit()
    await db.refresh(new_webinar)
    return new_webinar
