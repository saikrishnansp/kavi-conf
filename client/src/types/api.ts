// Conference Room Booking System - API Types

// Auth Types
export interface UserCreate {
  email: string;
  employee_id: string;
  full_name?: string;
  position?: string;
}

export interface UserResponse {
  employee_id: string;
  email: string;
  full_name: string | null;
  position: string | null;
  is_admin: boolean;
  created_at: string;
}

export interface Token {
  access_token: string;
  token_type: "bearer";
  user_email: string;
}

// Room Types
export interface BookingSnippet {
  id: number;
  start_time: string;
  end_time: string;
  subject: string;
  user_id: string;
}

export interface Room {
  room_id: string;
  capacity: number;
  amenities: string | null;
  is_split: boolean;
  parent_room_id?: string | null;
  is_active: boolean;
  created_at: string;
  current_booking?: BookingSnippet | null;
  next_available_at?: string | null;
}

export interface RoomListResponse {
  items: Room[];
  total: number;
}

export interface RoomCreate {
  room_id: string;
  capacity: number;
  amenities?: string;
  is_split?: boolean;
  parent_room_id?: string;
  is_active?: boolean;
}

// Booking Types
export interface BookingCreate {
  room_id: string;
  start_time: string;
  end_time: string;
  subject: string;
  description?: string;
  attendees: string[];
  additional_dates?: string[];
  google_event_id?: string;
  meet_link?: string;
}

export interface AttendeeDetail {
  full_name: string;
  email: string;
  employee_id?: string;
}

export interface BookingResponse {
  id: number;
  room_id: string;
  user_id: string;
  subject: string;
  description?: string;
  start_time: string;
  end_time: string;
  status: "confirmed" | "cancelled" | "completed";
  attendee_count: number;
  attendees: AttendeeDetail[];
  created_at: string;
  meet_link?: string | null;
  calendar_link?: string | null;
  google_event_id?: string | null;
}

export interface BookingListResponse {
  items: BookingResponse[];
  total: number;
}

// API Error
export interface ApiError {
  detail: string;
}
