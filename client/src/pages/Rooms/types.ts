import { Room } from "@/types/api";
import { Booking as UIBooking } from "@/components/BookingManagementDialogs";

export interface BookedSlot {
  start: string;
  end: string;
  subject: string;
  bookedBy: string;
}

export interface RoomWithBookings extends Room {
  bookedSlots: BookedSlot[];
}

export type { UIBooking };
