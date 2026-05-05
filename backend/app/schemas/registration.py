from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr


class RegistrationCreate(BaseModel):
    name: str
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    telegram: Optional[str] = None
    utm_source: Optional[str] = None
    utm_medium: Optional[str] = None
    utm_campaign: Optional[str] = None
    utm_term: Optional[str] = None
    utm_content: Optional[str] = None


class InviteRegistrationCreate(BaseModel):
    name: str
    phone: str
    email: EmailStr
    telegram: Optional[str] = None
    utm_source: Optional[str] = None
    utm_medium: Optional[str] = None
    utm_campaign: Optional[str] = None
    utm_term: Optional[str] = None
    utm_content: Optional[str] = None


class RegistrationOut(BaseModel):
    id: int
    webinar_id: int
    token: str
    name: str
    phone: Optional[str]
    email: Optional[str]
    telegram: Optional[str]
    utm_source: Optional[str]
    utm_medium: Optional[str]
    utm_campaign: Optional[str]
    utm_term: Optional[str]
    utm_content: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}
