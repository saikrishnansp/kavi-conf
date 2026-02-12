from typing import Optional, List
from datetime import datetime
from sqlmodel import SQLModel, Field, Index, Relationship
from app.db_models.enums import BookingStatus
from app.utils.tz import IST

class Booking(SQLModel, table=True):
    __tablename__ = "bookings"
    __table_args__ = (
        Index("idx_room_start_end", "room_id", "start_time", "end_time"),
        Index("idx_user_start", "user_id", "start_time"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    room_id: str = Field(foreign_key="rooms.room_id", nullable=False)
    user_id: str = Field(foreign_key="users.employee_id", nullable=False)
    start_time: datetime = Field(nullable=False)
    end_time: datetime = Field(nullable=False)
    attendee_count: int = Field(nullable=False)
    subject: str = Field(max_length=100, nullable=False)
    description: Optional[str] = Field(
        default=None
    )  # TEXT usually implies unbounded string in SQLModel/SQLAlchemy unless specified
    status: BookingStatus = Field(default=BookingStatus.CONFIRMED)
    meet_link: Optional[str] = Field(default=None)
    calendar_link: Optional[str] = Field(default=None)
    google_event_id: Optional[str] = Field(default=None)
    created_at: datetime = Field(default_factory=lambda: datetime.now(IST))

    # Relationships
    attendees_list: List["BookingAttendee"] = Relationship(
        sa_relationship_kwargs={"cascade": "all, delete"}
    )
