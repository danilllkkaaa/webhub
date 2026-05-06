from datetime import datetime
from typing import Optional
import enum

from sqlalchemy import String, Boolean, DateTime, Enum as SAEnum, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class UserRole(str, enum.Enum):
    owner = "owner"
    admin = "admin"
    manager = "manager"
    student = "student"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    organization_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    full_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    role: Mapped[UserRole] = mapped_column(SAEnum(UserRole), default=UserRole.owner)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
