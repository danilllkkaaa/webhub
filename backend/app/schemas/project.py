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
    organization_id: int
    name: str
    color: str
    webinar_count: int
    access_type: str = "owner"
    member_role: str | None = None
    created_at: datetime
