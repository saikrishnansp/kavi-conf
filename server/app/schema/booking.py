from pydantic import (
    BaseModel,
    field_validator,
    model_validator,
    ConfigDict,
    Field,
)
from datetime import datetime
from typing import Optional, List, Union
from app.db_models.enums import BookingStatus
from app.utils.validation import validate_booking_times, ensure_tz_aware


class BookingBase(BaseModel):
    room_id: str
    start_time: datetime
    end_time: datetime
    subject: str = Field(..., max_length=100)
    description: Optional[str] = Field(None, max_length=1000)

    @field_validator("start_time", "end_time", mode="after")
    @classmethod
    def validate_tz(cls, v: datetime) -> datetime:
        return ensure_tz_aware(v)


class BookingCreate(BookingBase):
    attendees: List[str] = Field(..., min_length=1, max_length=50)
    attendee_count: Optional[int] = None
    additional_dates: List[datetime] = []

    @field_validator("end_time")
    @classmethod
    def check_end_after_start(cls, v, info):
        if "start_time" in info.data:
            validate_booking_times(info.data["start_time"], v)
        return v

    @model_validator(mode="after")
    def set_attendee_count(self):
        count_from_list = len(self.attendees)
        # Always sync attendee_count with the length of the attendees list
        self.attendee_count = count_from_list
        return self


class BookingUpdate(BaseModel):
    room_id: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    subject: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = Field(None, max_length=1000)
    attendees: Optional[List[str]] = Field(None, min_length=1, max_length=50)

    @field_validator("start_time", "end_time", mode="after")
    @classmethod
    def validate_tz(cls, v: Optional[datetime]) -> Optional[datetime]:
        if v is None:
            return v
        return ensure_tz_aware(v)

    @model_validator(mode="after")
    def check_times(self):
        if self.start_time and self.end_time:
            validate_booking_times(self.start_time, self.end_time)
        return self


class BookingTransfer(BaseModel):
    new_owner_identifier: str = Field(
        ..., description="Email or Employee ID of the new owner"
    )


class AttendeeDetail(BaseModel):
    full_name: str
    email: str
    employee_id: Optional[str] = None


class BookingResponse(BookingBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: str
    attendee_count: int
    status: BookingStatus
    created_at: datetime
    attendees: List[AttendeeDetail] = []
    meet_link: Optional[str] = None
    calendar_link: Optional[str] = None
    google_event_id: Optional[str] = None

    @model_validator(mode="before")
    @classmethod
    def populate_attendees(cls, data: any) -> any:
        if hasattr(data, "attendees_list"):
            # When data is an ORM model
            data_dict = data.__dict__.copy()
            # The actual hydration logic will be handled in the CRUD layer 
            # or we can do a simple mapping here if the ORM objects are already hydrated.
            # However, to strictly follow the requirement of secondary query to User table,
            # we will expect the CRUD layer to provide the hydrated list or 
            # we map what we have in attendees_list which already has the details.
            data_dict["attendees"] = [
                {
                    "full_name": a.full_name or "External Guest",
                    "email": a.email,
                    "employee_id": a.employee_id if not a.employee_id.startswith("GUEST_") else None
                } for a in data.attendees_list
            ]
            return data_dict
        return data


class BookingListResponse(BaseModel):
    items: List[BookingResponse]
    total: int
