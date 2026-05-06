import asyncio
import json
import logging
from collections import defaultdict
from typing import Any

from fastapi import WebSocket
from redis.asyncio import Redis

from app.config import settings

logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self):
        # Local webinar_id -> list of websockets
        self._local_rooms: dict[int, list[WebSocket]] = defaultdict(list)
        self._redis: Redis | None = None
        self._pubsub_task: asyncio.Task | None = None

    async def _get_redis(self) -> Redis:
        if self._redis is None:
            self._redis = Redis.from_url(settings.redis_url, decode_responses=True)
        return self._redis

    async def connect(self, webinar_id: int, ws: WebSocket):
        await ws.accept()
        self._local_rooms[webinar_id].append(ws)

        # Start background task to listen to Redis if not already started
        if self._pubsub_task is None or self._pubsub_task.done():
            self._pubsub_task = asyncio.create_task(self._listen_to_redis())

    def disconnect(self, webinar_id: int, ws: WebSocket):
        try:
            self._local_rooms[webinar_id].remove(ws)
        except ValueError:
            pass

    async def broadcast(self, webinar_id: int, message: dict):
        """Publish message to Redis, which will then be picked up by all instances."""
        r = await self._get_redis()
        data = json.dumps({
            "webinar_id": webinar_id,
            "payload": message
        }, ensure_ascii=False, default=str)
        await r.publish("webinar_chats", data)

    async def send_personal(self, ws: WebSocket, message: dict):
        data = json.dumps(message, ensure_ascii=False, default=str)
        try:
            await ws.send_text(data)
        except Exception as e:
            logger.error(f"Error sending personal message: {e}")

    async def ban(self, webinar_id: int, registration_id: int):
        """Ban user via Redis set."""
        r = await self._get_redis()
        await r.sadd(f"banned:{webinar_id}", registration_id)
        # Also broadcast a ban event if needed
        await self.broadcast(webinar_id, {
            "type": "user_banned_event",
            "registration_id": registration_id
        })

    async def is_banned(self, webinar_id: int, registration_id: int) -> bool:
        r = await self._get_redis()
        return await r.sismember(f"banned:{webinar_id}", registration_id)

    async def _listen_to_redis(self):
        """Background task that listens to Redis and broadcasts to local clients."""
        r = await self._get_redis()
        pubsub = r.pubsub()
        await pubsub.subscribe("webinar_chats")
        
        try:
            async for message in pubsub.listen():
                if message["type"] == "message":
                    try:
                        data = json.loads(message["data"])
                        webinar_id = data["webinar_id"]
                        payload = data["payload"]
                        await self._local_broadcast(webinar_id, payload)
                    except (json.JSONDecodeError, KeyError) as e:
                        logger.error(f"Invalid message from Redis: {e}")
        except asyncio.CancelledError:
            await pubsub.unsubscribe("webinar_chats")
        except Exception as e:
            logger.error(f"Redis PubSub error: {e}")
            # Restart after a delay
            await asyncio.sleep(5)
            self._pubsub_task = asyncio.create_task(self._listen_to_redis())

    async def _local_broadcast(self, webinar_id: int, message: dict):
        """Actually send the message to local WebSockets for this webinar."""
        if not self._local_rooms[webinar_id]:
            return

        data = json.dumps(message, ensure_ascii=False, default=str)
        dead = []
        # Create a copy of the list to avoid issues with disconnect during iteration
        for ws in list(self._local_rooms[webinar_id]):
            try:
                await ws.send_text(data)
            except Exception:
                dead.append(ws)
        
        for ws in dead:
            self.disconnect(webinar_id, ws)


manager = ConnectionManager()
