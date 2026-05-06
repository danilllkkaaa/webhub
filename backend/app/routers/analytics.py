from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, distinct

from app.database import get_db
from app.models.user import User
from app.models.registration import Registration
from app.models.viewer_session import ViewerSession
from app.models.chat_message import ChatMessage
from app.models.offer_click import OfferClick
from app.schemas.analytics import WebinarAnalytics
from app.core.dependencies import get_current_user
from app.services.access import get_webinar_for_user

router = APIRouter(prefix="/admin/analytics", tags=["analytics"])


@router.get("/{webinar_id}", response_model=WebinarAnalytics)
async def get_analytics(
    webinar_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await get_webinar_for_user(webinar_id, current_user, db, permission="webinar.analytics")

    # Registrations count
    total_reg = await db.execute(
        select(func.count(Registration.id)).where(Registration.webinar_id == webinar_id)
    )
    total_reg = total_reg.scalar() or 0

    # Unique visitors (distinct registration_ids in viewer_sessions)
    total_vis = await db.execute(
        select(func.count(distinct(ViewerSession.registration_id))).where(ViewerSession.webinar_id == webinar_id)
    )
    total_vis = total_vis.scalar() or 0

    # Avg watch seconds
    avg_watch = await db.execute(
        select(func.avg(ViewerSession.watch_seconds)).where(ViewerSession.webinar_id == webinar_id)
    )
    avg_watch = float(avg_watch.scalar() or 0)

    # Chat messages
    total_chat = await db.execute(
        select(func.count(ChatMessage.id)).where(ChatMessage.webinar_id == webinar_id)
    )
    total_chat = total_chat.scalar() or 0

    # Offer clicks
    total_clicks = await db.execute(
        select(func.count(OfferClick.id)).where(OfferClick.webinar_id == webinar_id)
    )
    total_clicks = total_clicks.scalar() or 0

    # UTM breakdown
    utm_result = await db.execute(
        select(Registration.utm_source, func.count(Registration.id))
        .where(Registration.webinar_id == webinar_id)
        .group_by(Registration.utm_source)
    )
    utm_breakdown = {row[0] or "direct": row[1] for row in utm_result.all()}

    conv_reg_to_visit = round(total_vis / total_reg * 100, 1) if total_reg else 0
    conv_visit_to_click = round(total_clicks / total_vis * 100, 1) if total_vis else 0

    return WebinarAnalytics(
        webinar_id=webinar_id,
        total_registrations=total_reg,
        total_visitors=total_vis,
        conversion_reg_to_visit=conv_reg_to_visit,
        avg_watch_seconds=avg_watch,
        total_chat_messages=total_chat,
        total_offer_clicks=total_clicks,
        conversion_visit_to_click=conv_visit_to_click,
        utm_breakdown=utm_breakdown,
    )
