from datetime import datetime
from typing import Optional
from sqlalchemy import String, DateTime, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class OfferClick(Base):
    __tablename__ = "offer_clicks"

    id: Mapped[int] = mapped_column(primary_key=True)
    webinar_id: Mapped[int] = mapped_column(Integer, ForeignKey("webinars.id", ondelete="CASCADE"), index=True)
    registration_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("registrations.id", ondelete="SET NULL"), nullable=True)
    clicked_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
