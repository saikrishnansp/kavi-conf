import { api, API_URL } from "./axios";
import {
  Token,
  UserCreate,
  UserLogin,
  UserResponse
} from "@/types/api";

export const authApi = {
  getGoogleOAuthUrl: () => `${API_URL}/auth/login/google`,
  requestOtp: async (email: string): Promise<{ message: string }> => {
    const response = await api.post("/auth/request-otp", { email });
    return response.data;
  },
  verifyOtp: async (email: string, otp: string): Promise<Token> => {
    const response = await api.post<Token>("/auth/verify-otp", { email, otp });
    return response.data;
  },
  register: async (data: UserCreate): Promise<UserResponse> => {
    const response = await api.post<UserResponse>("/auth/register", data);
    return response.data;
  },
  logout: async (): Promise<void> => {
    await api.post("/auth/logout");
  },
  getMe: async (): Promise<UserResponse> => {
    const response = await api.get<UserResponse>("/auth/me");
    return response.data;
  },
  updateMe: async (data: Partial<UserResponse>): Promise<UserResponse> => {
    const response = await api.patch<UserResponse>("/auth/me", data);
    return response.data;
  },
  
  // Admin User Management
  getUserByEmail: async (email: string): Promise<UserResponse> => {
    const response = await api.get<UserResponse>(`/auth/user/${email}`);
    return response.data;
  },
  updateUser: async (employeeId: string, data: Partial<UserCreate>): Promise<UserResponse> => {
    const response = await api.patch<UserResponse>(`/auth/user/${employeeId}`, data);
    return response.data;
  },
  deleteUser: async (employeeId: string): Promise<void> => {
    await api.delete(`/auth/user/${employeeId}`);
  },
};
