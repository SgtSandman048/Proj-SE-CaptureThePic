// services/api.js
// Centralised Axios instance. All services import from here.

import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "https://proj-se-capturethepic-backend.onrender.com/api",
  withCredentials: true, // send httpOnly refresh-token cookie
});

// ── Request interceptor — attach Bearer token ──────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response interceptor — unwrap errors ──────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message ||
      error.message ||
      "An unexpected error occurred.";
    return Promise.reject(new Error(message));
  }
);

export default api;
