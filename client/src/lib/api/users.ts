import { api } from "./axios";
import { UserResponse } from "../../types/api";

export const usersApi = {
  /**
   * Search users by query or list all users if no query is provided.
   * Used for attendee search and admin employee management.
   */
  search: async (query: string): Promise<UserResponse[]> => {
    const params: Record<string, string | number> = {};

    // Only send search param when we actually have a value
    if (query && query.trim().length > 0) {
      params.search = query.trim();
    }

    const response = await api.get<UserResponse[]>("/users", {
      params,
    });
    return response.data;
  },

  /**
   * Admin: list users with optional search and pagination.
   */
  list: async (options?: {
    search?: string;
    skip?: number;
    limit?: number;
  }): Promise<UserResponse[]> => {
    const params: Record<string, string | number> = {};

    if (options?.search && options.search.trim().length > 0) {
      params.search = options.search.trim();
    }
    if (typeof options?.skip === "number") {
      params.skip = options.skip;
    }
    if (typeof options?.limit === "number") {
      params.limit = options.limit;
    }

    const response = await api.get<UserResponse[]>("/users", { params });
    return response.data;
  },

  getDirectory: async (): Promise<UserResponse[]> => {
    const response = await api.get<UserResponse[]>("/users/directory");
    return response.data;
  },

  getCount: async (): Promise<{ total_employees: number }> => {
    const response = await api.get<{ total_employees: number }>("/users/count");
    return response.data;
  },

  delete: async (employeeId: string, force: boolean = false): Promise<void> => {
    await api.delete(`/users/${employeeId}`, {
      params: { force },
    });
  },
};
