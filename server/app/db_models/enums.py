from enum import Enum


class BookingStatus(str, Enum):
    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"
    COMPLETED = "completed"
    TRANSFERRED = "transferred"
