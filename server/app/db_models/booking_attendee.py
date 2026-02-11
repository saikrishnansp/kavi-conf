from typing import Optional
from sqlmodel import SQLModel, Field


class BookingAttendee(SQLModel, table=True):
    __tablename__ = "booking_attendees"

    id: Optional[int] = Field(default=None, primary_key=True)
    booking_id: int = Field(foreign_key="bookings.id", nullable=False, index=True)
    email: str = Field(nullable=False)
    full_name: Optional[str] = Field(default=None)
    position: Optional[str] = Field(default=None)
    employee_id: str = Field(index=True, nullable=False)
