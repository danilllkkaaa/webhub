from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from pydantic import BaseModel
from typing import Optional

from app.database import get_db
from app.models.webinar import Webinar, WebinarType, WebinarStatus
from app.models.registration import Registration
from app.models.viewer_session import ViewerSession
from app.models.offer_click import OfferClick
from app.schemas.webinar import WebinarOut

router = APIRouter(tags=["watch"])


class WatchInfo(BaseModel):
    webinar: WebinarOut
    registration_id: int
    session_id: int
    viewer_name: str
    server_time: datetime
    autowebinar_offset: Optional[int] = None


class PingRequest(BaseModel):
    session_id: int
    token: str


class OfferClickRequest(BaseModel):
    registration_id: int
    token: str


async def _get_registration_by_token(db: AsyncSession, token: str) -> Registration:
    result = await db.execute(select(Registration).where(Registration.token == token))
    reg = result.scalar_one_or_none()
    if not reg:
        raise HTTPException(status_code=403, detail="Invalid token")
    return reg


@router.get("/webinars/{slug}/watch")
async def watch_info(
    slug: str,
    token: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> WatchInfo:
    result = await db.execute(select(Webinar).where(Webinar.slug == slug))
    webinar = result.scalar_one_or_none()
    if not webinar:
        raise HTTPException(status_code=404, detail="Webinar not found")

    reg_result = await db.execute(
        select(Registration).where(Registration.token == token, Registration.webinar_id == webinar.id)
    )
    reg = reg_result.scalar_one_or_none()
    if not reg:
        raise HTTPException(status_code=403, detail="Invalid token")

    # Create or retrieve session
    session = ViewerSession(
        registration_id=reg.id,
        webinar_id=webinar.id,
        entered_at=datetime.utcnow(),
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)

    offset = None
    if webinar.webinar_type == WebinarType.auto and webinar.scheduled_at:
        now = datetime.utcnow()
        delta = (now - webinar.scheduled_at).total_seconds()
        if delta > 0:
            offset = int(delta)

    return WatchInfo(
        webinar=WebinarOut.model_validate(webinar),
        registration_id=reg.id,
        session_id=session.id,
        viewer_name=reg.name,
        server_time=datetime.utcnow(),
        autowebinar_offset=offset,
    )


@router.post("/watch/ping")
async def ping(data: PingRequest, db: AsyncSession = Depends(get_db)):
    reg = await _get_registration_by_token(db, data.token)
    session_result = await db.execute(
        select(ViewerSession).where(
            ViewerSession.id == data.session_id,
            ViewerSession.registration_id == reg.id,
            ViewerSession.webinar_id == reg.webinar_id,
        )
    )
    if not session_result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Invalid session")

    now = datetime.utcnow()
    await db.execute(
        update(ViewerSession)
        .where(ViewerSession.id == data.session_id)
        .values(last_ping_at=now, watch_seconds=ViewerSession.watch_seconds + 30)
    )
    await db.commit()
    return {"ok": True}


@router.post("/watch/exit")
async def exit_watch(data: PingRequest, db: AsyncSession = Depends(get_db)):
    reg = await _get_registration_by_token(db, data.token)
    session_result = await db.execute(
        select(ViewerSession).where(
            ViewerSession.id == data.session_id,
            ViewerSession.registration_id == reg.id,
            ViewerSession.webinar_id == reg.webinar_id,
        )
    )
    if not session_result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Invalid session")

    await db.execute(
        update(ViewerSession)
        .where(ViewerSession.id == data.session_id)
        .values(exited_at=datetime.utcnow())
    )
    await db.commit()
    return {"ok": True}


@router.post("/watch/offer-click")
async def offer_click(data: OfferClickRequest, request: Request, db: AsyncSession = Depends(get_db)):
    reg = await _get_registration_by_token(db, data.token)
    if reg.id != data.registration_id:
        raise HTTPException(status_code=403, detail="Invalid registration")

    click = OfferClick(
        webinar_id=reg.webinar_id,
        registration_id=reg.id,
        ip_address=request.client.host if request.client else None,
    )
    db.add(click)
    await db.commit()
    return {"ok": True}
