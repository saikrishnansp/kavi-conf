from typing import Optional
from datetime import datetime
from sqlmodel import SQLModel, Field
from app.utils.tz import IST

class Room(SQLModel, table=True):
    __tablename__ = "rooms"

    room_id: str = Field(primary_key=True, index=True, nullable=False)
    capacity: int = Field(nullable=False)
    amenities: Optional[str] = Field(default=None)
    is_split: bool = Field(default=False)
    parent_room_id: Optional[str] = Field(default=None, foreign_key="rooms.room_id")
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(IST))
