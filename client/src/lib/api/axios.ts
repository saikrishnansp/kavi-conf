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
    let friendlyMessage = "Oops! Something went wrong on our end. Please try again later.";

    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;

      switch (status) {
        case 400:
        case 422:
          // Use specific backend message if available and safe, else fallback to default
          if (typeof data?.detail === "string") {
            friendlyMessage = data.detail;
          } else {
            friendlyMessage = "Double-check your information and try again.";
          }
          break;
        case 401:
          friendlyMessage = "Your session has expired. Please log in again.";
          break;
        case 403:
          friendlyMessage = "You don't have permission to perform this action.";
          break;
        case 404:
          friendlyMessage = "We couldn't find what you were looking for.";
          break;
        case 409:
          friendlyMessage = data?.detail || "There is a scheduling conflict or duplicate entry. Please check and try again.";
          break;
        default:
          if (status >= 500) {
            friendlyMessage = "Oops! Something went wrong on our end. Please try again later.";
          }
          break;
      }
    } else if (error.request) {
      // Network error (no response received)
      friendlyMessage = "Please check your internet connection and try again.";
    }

    return Promise.reject(new Error(friendlyMessage));
  }
);

export { AxiosError, API_URL };