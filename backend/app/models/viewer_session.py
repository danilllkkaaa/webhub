from datetime import datetime
from typing import Optional
from sqlalchemy import String, DateTime, ForeignKey, Integer, Float
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class ViewerSession(Base):
    __tablename__ = "viewer_sessions"

    id: Mapped[int] = mapped_column(primary_key=True)
    registration_id: Mapped[int] = mapped_column(Integer, ForeignKey("registrations.id", ondelete="CASCADE"), index=True)
    webinar_id: Mapped[int] = mapped_column(Integer, ForeignKey("webinars.id", ondelete="CASCADE"), index=True)
    entered_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    last_ping_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    exited_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    watch_seconds: Mapped[int] = mapped_column(Integer, default=0)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
