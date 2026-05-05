from datetime import datetime
from typing import Optional
from sqlalchemy import String, Text, DateTime, Boolean, Integer, Enum as SAEnum, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
import enum

from app.database import Base


class WebinarType(str, enum.Enum):
    live = "live"
    auto = "auto"


class WebinarStatus(str, enum.Enum):
    draft = "draft"
    scheduled = "scheduled"
    live = "live"
    finished = "finished"


class Webinar(Base):
    __tablename__ = "webinars"

    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    invite_token: Mapped[Optional[str]] = mapped_column(String(64), unique=True, index=True, nullable=True)
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    webinar_type: Mapped[WebinarType] = mapped_column(SAEnum(WebinarType), default=WebinarType.live)
    status: Mapped[WebinarStatus] = mapped_column(SAEnum(WebinarStatus), default=WebinarStatus.draft)
    youtube_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    video_id: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    scheduled_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    duration_minutes: Mapped[Optional[int]] = mapped_column(nullable=True)
    offer_text: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    offer_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    offer_button_text: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, default="Получить")
    chat_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    project_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("projects.id", ondelete="SET NULL"), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
