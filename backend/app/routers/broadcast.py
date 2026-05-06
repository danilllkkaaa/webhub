import html
import json
from datetime import datetime
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, distinct

from app.database import get_db, AsyncSessionLocal
from app.models.webinar import Webinar
from app.models.viewer_session import ViewerSession
from app.models.chat_message import ChatMessage
from app.core.security import decode_token
from app.websocket.manager import manager

router = APIRouter(tags=["broadcast"])


async def _get_admin_from_token(token: str) -> int:
    """Return user_id from JWT or raise 4001."""
    payload = decode_token(token)
    if not payload:
        return None
    return int(payload.get("sub", 0))


@router.get("/admin/webinars/{webinar_id}/viewer-count")
async def viewer_count(
    webinar_id: int,
    db: AsyncSession = Depends(get_db),
    token: str = Query(...),
):
    if not await _get_admin_from_token(token):
        raise HTTPException(status_code=403)

    # Active sessions: last ping within 90s
    cutoff = datetime.utcnow()
    from datetime import timedelta
    cutoff = cutoff - timedelta(seconds=90)

    total = await db.execute(
        select(func.count(distinct(ViewerSession.registration_id)))
        .where(ViewerSession.webinar_id == webinar_id)
        .where(ViewerSession.exited_at.is_(None))
        .where(ViewerSession.last_ping_at >= cutoff)
    )
    return {"count": total.scalar() or 0}


@router.delete("/admin/webinars/{webinar_id}/chat/messages/{message_id}")
async def delete_chat_message(
    webinar_id: int,
    message_id: int,
    db: AsyncSession = Depends(get_db),
    token: str = Query(...),
):
    if not await _get_admin_from_token(token):
        raise HTTPException(status_code=403)

    await db.execute(
        select(ChatMessage).where(ChatMessage.id == message_id, ChatMessage.webinar_id == webinar_id)
    )
    # Simple delete
    from sqlalchemy import delete
    await db.execute(delete(ChatMessage).where(ChatMessage.id == message_id))
    await db.commit()

    await manager.broadcast(webinar_id, {"type": "message_deleted", "id": message_id})
    return {"ok": True}


@router.post("/admin/webinars/{webinar_id}/chat/ban/{message_id}")
async def ban_user_by_message(
    webinar_id: int,
    message_id: int,
    db: AsyncSession = Depends(get_db),
    token: str = Query(...),
):
    if not await _get_admin_from_token(token):
        raise HTTPException(status_code=403)

    result = await db.execute(select(ChatMessage).where(ChatMessage.id == message_id))
    msg = result.scalar_one_or_none()
    if not msg or not msg.registration_id:
        raise HTTPException(status_code=404, detail="Message or user not found")

    await manager.ban(webinar_id, msg.registration_id)
    
    # Optional: delete all messages from this user
    # from sqlalchemy import delete
    # await db.execute(delete(ChatMessage).where(ChatMessage.registration_id == msg.registration_id))
    # await db.commit()

    return {"ok": True, "author": msg.author_name}


@router.websocket("/ws/admin-chat/{webinar_id}")
async def admin_chat_ws(webinar_id: int, ws: WebSocket, token: str = Query(...)):
    user_id = await _get_admin_from_token(token)
    if not user_id:
        await ws.close(code=4001)
        return

    async with AsyncSessionLocal() as db:
        wb = await db.execute(select(Webinar).where(Webinar.id == webinar_id))
        if not wb.scalar_one_or_none():
            await ws.close(code=4004)
            return

    await manager.connect(webinar_id, ws)

    # Send last 100 messages
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(ChatMessage)
            .where(ChatMessage.webinar_id == webinar_id)
            .order_by(ChatMessage.created_at.desc())
            .limit(100)
        )
        msgs = list(reversed(result.scalars().all()))
        for m in msgs:
            await manager.send_personal(ws, {
                "type": "chat_message",
                "id": m.id,
                "author": m.author_name,
                "text": m.text,
                "ts": m.created_at.isoformat(),
                "is_admin": m.registration_id is None,
            })

    try:
        while True:
            raw = await ws.receive_text()
            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                continue

            if data.get("type") != "chat_message":
                continue

            text = str(data.get("text", "")).strip()
            if not text or len(text) > 1000:
                continue

            text = html.escape(text)

            async with AsyncSessionLocal() as db:
                msg = ChatMessage(
                    webinar_id=webinar_id,
                    registration_id=None,
                    author_name="Модератор",
                    text=text,
                )
                db.add(msg)
                await db.commit()
                await db.refresh(msg)

            await manager.broadcast(webinar_id, {
                "type": "chat_message",
                "id": msg.id,
                "author": msg.author_name,
                "text": msg.text,
                "ts": msg.created_at.isoformat(),
                "is_admin": True,
            })

    except WebSocketDisconnect:
        manager.disconnect(webinar_id, ws)
