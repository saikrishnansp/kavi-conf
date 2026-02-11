from typing import Optional
from datetime import datetime
from sqlmodel import SQLModel, Field
from app.utils.tz import IST

class Room(SQLModel, table=True):
    __tablename__ = "rooms"

    id: Optional[int] = Field(default=None, primary_key=True)
    room_id: str = Field(unique=True, index=True, nullable=False)
    name: str = Field(nullable=False)
    capacity: int = Field(nullable=False)
    is_split: bool = Field(default=False)
    parent_room_id: Optional[int] = Field(default=None, foreign_key="rooms.id")
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(IST))
