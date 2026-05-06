from datetime import datetime
from pydantic import BaseModel, EmailStr

from app.models.project_member import ProjectMemberRole
from app.models.user import UserRole


class StaffProjectAccessOut(BaseModel):
    project_id: int
    project_name: str
    project_color: str
    role: ProjectMemberRole
    created_at: datetime


class StaffUserOut(BaseModel):
    id: int
    organization_id: int | None
    email: str
    full_name: str | None
    role: UserRole
    is_active: bool
    created_at: datetime
    projects: list[StaffProjectAccessOut] = []

    model_config = {"from_attributes": True}


class StaffCreate(BaseModel):
    email: EmailStr
    full_name: str | None = None
    temp_password: str | None = None
    organization_role: UserRole = UserRole.manager
    project_id: int
    project_role: ProjectMemberRole


class StaffUpdate(BaseModel):
    full_name: str | None = None
    organization_role: UserRole | None = None
    is_active: bool | None = None


class ProjectMemberCreate(BaseModel):
    email: EmailStr
    full_name: str | None = None
    temp_password: str | None = None
    organization_role: UserRole = UserRole.manager
    role: ProjectMemberRole


class ProjectMemberUpdate(BaseModel):
    role: ProjectMemberRole


class ProjectMemberOut(BaseModel):
    id: int
    project_id: int
    user_id: int
    email: str
    full_name: str | None
    organization_role: UserRole
    role: ProjectMemberRole
    is_active: bool
    created_at: datetime
