import { api } from "./axios";
import {
  Room,
  RoomCreate,
  RoomListResponse
} from "@/types/api";

export const roomsApi = {
  getAll: async (active_only: boolean = true): Promise<RoomListResponse> => {
    const response = await api.get<RoomListResponse>("/rooms", { params: { active_only } });
    return response.data;
  },
  getOne: async (roomId: string): Promise<Room> => {
    const response = await api.get<Room>(`/rooms/${roomId}`);
    return response.data;
  },
  create: async (data: RoomCreate): Promise<Room> => {
    const response = await api.post<Room>("/rooms", data);
    return response.data;
  },
  update: async (roomId: string, data: Partial<RoomCreate>): Promise<Room> => {
    const response = await api.patch<Room>(`/rooms/${roomId}`, data);
    return response.data;
  },
  delete: async (roomId: string): Promise<void> => {
    await api.delete(`/rooms/${roomId}`);
  },
  
  // Room Holds
  holdRoom: async (roomId: string): Promise<{ message: string; expires_at: string }> => {
    const response = await api.post(`/rooms/${roomId}/hold`);
    return response.data;
  },
  releaseHold: async (roomId: string): Promise<void> => {
    await api.delete(`/rooms/${roomId}/hold`);
  },
};
