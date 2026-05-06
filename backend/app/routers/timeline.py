from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.user import User
from app.models.webinar import Webinar
from app.models.timeline_event import TimelineEvent
from app.schemas.timeline import TimelineEventCreate, TimelineEventUpdate, TimelineEventOut
from app.core.dependencies import get_current_user
from app.services.access import get_webinar_for_user, require_organization_id

router = APIRouter(tags=["timeline"])


@router.get("/admin/webinars/{webinar_id}/timeline", response_model=list[TimelineEventOut])
async def list_events(
    webinar_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await get_webinar_for_user(webinar_id, current_user, db, permission="webinar.view")
    result = await db.execute(
        select(TimelineEvent)
        .where(TimelineEvent.webinar_id == webinar_id)
        .order_by(TimelineEvent.offset_seconds)
    )
    return result.scalars().all()


@router.post("/admin/webinars/{webinar_id}/timeline", response_model=TimelineEventOut, status_code=201)
async def create_event(
    webinar_id: int,
    data: TimelineEventCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await get_webinar_for_user(webinar_id, current_user, db, permission="webinar.update")
    event = TimelineEvent(webinar_id=webinar_id, **data.model_dump())
    db.add(event)
    await db.commit()
    await db.refresh(event)
    return event


@router.patch("/admin/timeline/{event_id}", response_model=TimelineEventOut)
async def update_event(
    event_id: int,
    data: TimelineEventUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    organization_id = require_organization_id(current_user)
    result = await db.execute(
        select(TimelineEvent)
        .join(Webinar, TimelineEvent.webinar_id == Webinar.id)
        .where(TimelineEvent.id == event_id, Webinar.organization_id == organization_id)
    )
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(event, field, value)
    await db.commit()
    await db.refresh(event)
    return event


@router.delete("/admin/timeline/{event_id}", status_code=204)
async def delete_event(
    event_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    organization_id = require_organization_id(current_user)
    result = await db.execute(
        select(TimelineEvent)
        .join(Webinar, TimelineEvent.webinar_id == Webinar.id)
        .where(TimelineEvent.id == event_id, Webinar.organization_id == organization_id)
    )
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404)
    await db.delete(event)
    await db.commit()


@router.get("/webinars/{webinar_id}/timeline", response_model=list[TimelineEventOut])
async def public_timeline(webinar_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(TimelineEvent)
        .where(TimelineEvent.webinar_id == webinar_id)
        .order_by(TimelineEvent.offset_seconds)
    )
    return result.scalars().all()
