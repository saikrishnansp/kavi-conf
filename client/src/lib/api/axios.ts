import axios, { AxiosError } from "axios";

const API_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000/api/v1";

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 422) {
      // Handle Pydantic validation errors
      const detail = error.response.data?.detail;
      let message = "Validation Error";
      
      if (typeof detail === "string") {
        message = detail;
      } else if (Array.isArray(detail)) {
        message = detail.map((d: any) => `${d.loc.join(".")}: ${d.msg}`).join(", ");
      } else if (typeof detail === "object" && detail !== null) {
        message = JSON.stringify(detail);
      }
      
      return Promise.reject(new Error(message));
    }
    return Promise.reject(error);
  }
);

export { AxiosError, API_URL };