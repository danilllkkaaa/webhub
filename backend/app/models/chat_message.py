from datetime import datetime
from typing import Optional
from sqlalchemy import String, Text, DateTime, ForeignKey, Integer, Boolean
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id: Mapped[int] = mapped_column(primary_key=True)
    webinar_id: Mapped[int] = mapped_column(Integer, ForeignKey("webinars.id", ondelete="CASCADE"), index=True)
    registration_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("registrations.id", ondelete="SET NULL"), nullable=True)
    author_name: Mapped[str] = mapped_column(String(255))
    text: Mapped[str] = mapped_column(Text)
    is_scripted: Mapped[bool] = mapped_column(Boolean, default=False)
    offset_seconds: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
