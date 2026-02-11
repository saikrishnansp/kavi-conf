import { api } from "./axios";
import {
  BookingCreate,
  BookingListResponse,
  BookingResponse
} from "@/types/api";

export const bookingsApi = {
  getAll: async (params?: { 
    skip?: number; 
    limit?: number; 
    date?: string; 
    all_bookings?: boolean 
  }): Promise<BookingListResponse> => {
    const response = await api.get<BookingListResponse>("/bookings", { params });
    return response.data;
  },
  getRange: async (startTime: string, endTime: string): Promise<BookingResponse[]> => {
    const response = await api.get<BookingResponse[]>("/bookings/range", {
      params: { start_time: startTime, end_time: endTime },
    });
    return response.data;
  },
  getOne: async (bookingId: number): Promise<BookingResponse> => {
    const response = await api.get<BookingResponse>(`/bookings/${bookingId}`);
    return response.data;
  },
  create: async (data: BookingCreate, googleToken?: string): Promise<BookingResponse> => {
    // If not passed explicitly, try to get from localStorage
    const gToken = googleToken || localStorage.getItem("google_token");
    const headers = gToken ? { "x-google-token": gToken } : {};
    const response = await api.post<BookingResponse>("/bookings", data, { headers });
    return response.data;
  },
  update: async (bookingId: number, data: Partial<BookingCreate>): Promise<BookingResponse> => {
    const response = await api.put<BookingResponse>(`/bookings/${bookingId}`, data);
    return response.data;
  },
  cancel: async (bookingId: number): Promise<void> => {
    await api.delete(`/bookings/${bookingId}`);
  },
  transfer: async (bookingId: number, newOwnerIdentifier: string): Promise<BookingResponse> => {
    const response = await api.post<BookingResponse>(`/bookings/${bookingId}/transfer`, {
      new_owner_identifier: newOwnerIdentifier,
    });
    return response.data;
  },
};
