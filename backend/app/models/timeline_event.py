from datetime import datetime
from typing import Optional
from sqlalchemy import String, Text, DateTime, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import Enum as SAEnum
import enum

from app.database import Base


class EventType(str, enum.Enum):
    chat_message = "chat_message"
    offer_show = "offer_show"
    offer_hide = "offer_hide"
    banner_show = "banner_show"
    banner_hide = "banner_hide"
    redirect = "redirect"


class TimelineEvent(Base):
    __tablename__ = "timeline_events"

    id: Mapped[int] = mapped_column(primary_key=True)
    webinar_id: Mapped[int] = mapped_column(Integer, ForeignKey("webinars.id", ondelete="CASCADE"), index=True)
    event_type: Mapped[EventType] = mapped_column(SAEnum(EventType))
    offset_seconds: Mapped[int] = mapped_column(Integer)
    payload: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
