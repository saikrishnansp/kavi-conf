from typing import Optional
from datetime import datetime
from sqlmodel import SQLModel, Field, Index
from app.utils.tz import IST


class RoomHold(SQLModel, table=True):
    __tablename__ = "room_holds"
    __table_args__ = (Index("idx_expires_at", "expires_at"),)

    id: Optional[int] = Field(default=None, primary_key=True)
    room_id: str = Field(foreign_key="rooms.room_id", unique=True, nullable=False)
    user_id: str = Field(foreign_key="users.employee_id", nullable=False, index=True)
    expires_at: datetime = Field(nullable=False)
    created_at: datetime = Field(default_factory=lambda: datetime.now(IST))
