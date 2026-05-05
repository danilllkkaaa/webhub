from datetime import datetime
from pydantic import BaseModel


class ProjectCreate(BaseModel):
    name: str
    color: str = "#2D9A27"


class ProjectUpdate(BaseModel):
    name: str | None = None
    color: str | None = None


class ProjectOut(BaseModel):
    id: int
    name: str
    color: str
    webinar_count: int
    created_at: datetime
