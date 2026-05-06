from datetime import datetime
from typing import Optional
import re
from pydantic import BaseModel, EmailStr, field_validator


PHONE_RE = re.compile(r"^\+?[0-9\s().-]{7,24}$")


def validate_name(value: str) -> str:
    value = value.strip()
    if len(value) < 2:
        raise ValueError("Name must be at least 2 characters")
    return value


def validate_phone(value: Optional[str]) -> Optional[str]:
    if value is None or value == "":
        return value
    value = value.strip()
    if not PHONE_RE.match(value):
        raise ValueError("Invalid phone")
    return value


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

    @field_validator("name")
    @classmethod
    def name_is_valid(cls, value: str) -> str:
        return validate_name(value)

    @field_validator("phone")
    @classmethod
    def phone_is_valid(cls, value: Optional[str]) -> Optional[str]:
        return validate_phone(value)


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

    @field_validator("name")
    @classmethod
    def name_is_valid(cls, value: str) -> str:
        return validate_name(value)

    @field_validator("phone")
    @classmethod
    def phone_is_valid(cls, value: str) -> str:
        return validate_phone(value) or value


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
