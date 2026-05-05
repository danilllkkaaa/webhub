from datetime import datetime
from typing import Optional
from pydantic import BaseModel

from app.models.timeline_event import EventType


class TimelineEventCreate(BaseModel):
    event_type: EventType
    offset_seconds: int
    payload: Optional[str] = None


class TimelineEventUpdate(BaseModel):
    event_type: Optional[EventType] = None
    offset_seconds: Optional[int] = None
    payload: Optional[str] = None


class TimelineEventOut(BaseModel):
    id: int
    webinar_id: int
    event_type: EventType
    offset_seconds: int
    payload: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}
