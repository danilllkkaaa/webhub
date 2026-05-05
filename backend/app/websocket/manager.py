import json
from collections import defaultdict
from fastapi import WebSocket


class ConnectionManager:
    def __init__(self):
        # webinar_id -> list of websockets
        self._rooms: dict[int, list[WebSocket]] = defaultdict(list)

    async def connect(self, webinar_id: int, ws: WebSocket):
        await ws.accept()
        self._rooms[webinar_id].append(ws)

    def disconnect(self, webinar_id: int, ws: WebSocket):
        try:
            self._rooms[webinar_id].remove(ws)
        except ValueError:
            pass

    async def broadcast(self, webinar_id: int, message: dict):
        data = json.dumps(message, ensure_ascii=False, default=str)
        dead = []
        for ws in list(self._rooms[webinar_id]):
            try:
                await ws.send_text(data)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(webinar_id, ws)

    async def send_personal(self, ws: WebSocket, message: dict):
        data = json.dumps(message, ensure_ascii=False, default=str)
        await ws.send_text(data)


manager = ConnectionManager()
