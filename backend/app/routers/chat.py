import json
import time
from collections import defaultdict
from datetime import datetime
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db, AsyncSessionLocal
from app.models.webinar import Webinar
from app.models.registration import Registration
from app.models.chat_message import ChatMessage
from app.websocket.manager import manager

router = APIRouter(tags=["chat"])

# Simple rate limiter: registration_id -> list of timestamps
_rate: dict[int, list[float]] = defaultdict(list)
RATE_LIMIT = 5  # messages per 10 seconds


def _is_rate_limited(reg_id: int) -> bool:
    now = time.time()
    _rate[reg_id] = [t for t in _rate[reg_id] if now - t < 10]
    if len(_rate[reg_id]) >= RATE_LIMIT:
        return True
    _rate[reg_id].append(now)
    return False


@router.websocket("/ws/chat/{webinar_id}")
async def chat_ws(webinar_id: int, ws: WebSocket, token: str):
    async with AsyncSessionLocal() as db:
        reg_result = await db.execute(
            select(Registration).where(Registration.token == token, Registration.webinar_id == webinar_id)
        )
        reg = reg_result.scalar_one_or_none()
        if not reg:
            await ws.close(code=4001)
            return

        wb_result = await db.execute(select(Webinar).where(Webinar.id == webinar_id))
        webinar = wb_result.scalar_one_or_none()
        if not webinar:
            await ws.close(code=4004)
            return

    await manager.connect(webinar_id, ws)

    # Send recent chat history
    async with AsyncSessionLocal() as db:
        history = await db.execute(
            select(ChatMessage)
            .where(ChatMessage.webinar_id == webinar_id)
            .order_by(ChatMessage.created_at.desc())
            .limit(50)
        )
        messages = list(reversed(history.scalars().all()))
        for msg in messages:
            await manager.send_personal(ws, {
                "type": "chat_message",
                "id": msg.id,
                "author": msg.author_name,
                "text": msg.text,
                "ts": msg.created_at.isoformat(),
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
            if not text or len(text) > 500:
                continue

            # XSS sanitize: strip tags
            import html
            text = html.escape(text)

            if _is_rate_limited(reg.id):
                await manager.send_personal(ws, {"type": "error", "text": "Слишком часто"})
                continue

            async with AsyncSessionLocal() as db:
                msg = ChatMessage(
                    webinar_id=webinar_id,
                    registration_id=reg.id,
                    author_name=reg.name,
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
            })

    except WebSocketDisconnect:
        manager.disconnect(webinar_id, ws)
