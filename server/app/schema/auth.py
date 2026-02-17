from pydantic import BaseModel, EmailStr, Field, field_validator, ConfigDict
from typing import Optional
from datetime import datetime
from app.utils.validation import (
    validate_password_complexity,
    validate_email_domain,
    validate_employee_id,
)


class UserCreate(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    position: Optional[str] = None
    employee_id: str

    @field_validator("email")
    @classmethod
    def check_email_domain(cls, v: str) -> str:
        return validate_email_domain(v)

    @field_validator("employee_id")
    @classmethod
    def check_employee_id(cls, v: Optional[str]) -> Optional[str]:
        return validate_employee_id(v)


class OTPRequest(BaseModel):
    email: EmailStr


class OTPVerify(BaseModel):
    email: EmailStr
    otp: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_email: str
    google_access_token: Optional[str] = None


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    employee_id: str

    email: EmailStr

    full_name: Optional[str] = None

    position: Optional[str] = None

    is_admin: bool

    created_at: datetime


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    position: Optional[str] = None

    @field_validator("email")
    @classmethod
    def check_email_domain(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        return validate_email_domain(v)
