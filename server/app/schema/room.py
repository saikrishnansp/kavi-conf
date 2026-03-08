from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from datetime import datetime
from typing import Optional, List, Union


class RoomBase(BaseModel):
    room_id: str = Field(..., description="Unique room identifier (e.g. '101-Conference-A')")
    capacity: int = Field(..., gt=0)
    amenities: Optional[str] = Field(None, description="List of amenities (e.g. 'Projector, Whiteboard')")
    is_split: bool = False
    parent_room_id: Optional[str] = None
    # Frontend sends this, we accept it to prevent 422 errors, but it's optional
    room_number: Optional[int] = None 


class BookingSnippet(BaseModel):
    id: int
    start_time: datetime
    end_time: datetime
    subject: str
    user_id: str


class RoomCreate(RoomBase):
    @model_validator(mode='after')
    def validate_split_logic(self):
        if self.is_split and not self.parent_room_id:
            raise ValueError("parent_room_id is required for split rooms")
        return self


class RoomUpdate(BaseModel):
    room_id: Optional[str] = None
    capacity: Optional[int] = Field(None, gt=0)
    amenities: Optional[str] = None
    is_split: Optional[bool] = None
    parent_room_id: Optional[str] = None
    is_active: Optional[bool] = None
    room_number: Optional[int] = None


class RoomResponse(RoomBase):
    model_config = ConfigDict(from_attributes=True)
    is_active: bool
    created_at: datetime
    current_booking: Optional[BookingSnippet] = None
    next_available_at: Optional[datetime] = None


class RoomListResponse(BaseModel):
    items: List[RoomResponse]
    total: int
