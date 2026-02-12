from typing import Optional
from datetime import datetime
from sqlmodel import SQLModel, Field
from app.utils.tz import IST


class User(SQLModel, table=True):
    __tablename__ = "users"

    employee_id: str = Field(primary_key=True)
    email: str = Field(unique=True, index=True, nullable=False)
    password_hash: str = Field(nullable=False)
    full_name: Optional[str] = Field(default=None)
    position: Optional[str] = Field(default=None)
    google_refresh_token: Optional[str] = Field(default=None)
    created_at: datetime = Field(default_factory=lambda: datetime.now(IST))

    @property
    def is_admin(self) -> bool:
        """Check if user has admin privileges based on position."""
        return self.position in ["CEO", "Director", "Manager"]
