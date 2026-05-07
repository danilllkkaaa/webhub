from typing import Optional
import re
from pydantic import BaseModel, EmailStr, field_validator, model_validator

from app.models.user import UserRole


def validate_password_strength(value: str) -> str:
    if len(value) < 6:
        raise ValueError("Password must be at least 6 characters")
    if not re.search(r"[A-Za-zА-Яа-яЁё]", value):
        raise ValueError("Password must contain at least one letter")
    if not re.search(r"\d", value):
        raise ValueError("Password must contain at least one digit")
    return value


class LoginRequest(BaseModel):
    email: EmailStr
    password: str

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        return validate_password_strength(value)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class OrganizationRegisterRequest(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    password_confirm: str
    organization_name: str
    project_name: str

    @field_validator("full_name", "organization_name", "project_name")
    @classmethod
    def validate_names(cls, value: str) -> str:
        value = value.strip()
        if len(value) < 2:
            raise ValueError("Value must be at least 2 characters")
        return value

    @field_validator("password", "password_confirm")
    @classmethod
    def validate_password(cls, value: str) -> str:
        return validate_password_strength(value)

    @model_validator(mode="after")
    def passwords_match(self):
        if self.password != self.password_confirm:
            raise ValueError("Passwords do not match")
        return self


class UserOut(BaseModel):
    id: int
    organization_id: Optional[int] = None
    email: str
    full_name: Optional[str] = None
    role: UserRole = UserRole.owner

    model_config = {"from_attributes": True}


class UpdateProfileRequest(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, value: Optional[str]) -> Optional[str]:
        if value is not None and len(value.strip()) < 2:
            raise ValueError("Full name must be at least 2 characters")
        return value


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

    @field_validator("current_password", "new_password")
    @classmethod
    def validate_passwords(cls, value: str) -> str:
        return validate_password_strength(value)


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ForgotPasswordResponse(BaseModel):
    message: str
    reset_token: Optional[str] = None


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str
    password_confirm: str

    @field_validator("new_password", "password_confirm")
    @classmethod
    def validate_password(cls, value: str) -> str:
        return validate_password_strength(value)

    @model_validator(mode="after")
    def passwords_match(self):
        if self.new_password != self.password_confirm:
            raise ValueError("Passwords do not match")
        return self
