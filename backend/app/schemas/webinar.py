from datetime import datetime
from typing import Optional
from pydantic import BaseModel

from app.models.webinar import WebinarType, WebinarStatus


class WebinarCreate(BaseModel):
    title: str
    description: Optional[str] = None
    webinar_type: WebinarType = WebinarType.live
    youtube_url: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    offer_text: Optional[str] = None
    offer_url: Optional[str] = None
    offer_button_text: Optional[str] = "Получить"
    chat_enabled: bool = True
    project_id: Optional[int] = None


class WebinarUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    webinar_type: Optional[WebinarType] = None
    status: Optional[WebinarStatus] = None
    youtube_url: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    offer_text: Optional[str] = None
    offer_url: Optional[str] = None
    offer_button_text: Optional[str] = None
    chat_enabled: Optional[bool] = None


class WebinarOut(BaseModel):
    id: int
    slug: str
    invite_token: Optional[str]
    title: str
    description: Optional[str]
    webinar_type: WebinarType
    status: WebinarStatus
    youtube_url: Optional[str]
    video_id: Optional[str]
    scheduled_at: Optional[datetime]
    duration_minutes: Optional[int]
    offer_text: Optional[str]
    offer_url: Optional[str]
    offer_button_text: Optional[str]
    chat_enabled: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
