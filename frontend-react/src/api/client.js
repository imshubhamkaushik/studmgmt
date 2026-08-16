import axios from "axios";
import { ApiError } from "./ApiError";
import { getAccessToken, setAccessToken } from "../auth/tokenStore";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

if (!API_BASE_URL) throw new Error("VITE_API_BASE_URL is not configured.");

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

let refreshPromise = null;

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Exchanges the HttpOnly refresh-token cookie for a new short-lived access
// token. Used both by the 401-retry interceptor below and by AuthProvider
// on initial page load to silently re-establish a session without ever
// having stored the access token itself.
export async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(
        `${API_BASE_URL.replace(/\/$/, "")}/auth/refresh`,
        {},
        {
          withCredentials: true,
          timeout: 10000,
          headers: { "Content-Type": "application/json" },
        },
      )
      .then((r) => r.data?.data?.accessToken)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

apiClient.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const original = error.config || {};
    const url = String(original.url || "");

    const isAuthEndpoint =
      url.includes("/auth/login") || url.includes("/auth/refresh");

    if (error.response?.status === 401 && !original._retry && !isAuthEndpoint) {
      original._retry = true;
      try {
        const token = await refreshAccessToken();

        if (!token) throw new Error("No refreshed token returned");

        setAccessToken(token);

        original.headers ??= {};
        original.headers.Authorization = `Bearer ${token}`;

        return apiClient(original);
      } catch {
        setAccessToken(null);
        window.dispatchEvent(new Event("auth:expired"));
      }
    }

    const apiError = error.response?.data;

    const message =
      apiError?.message ||
      (error.code === "ECONNABORTED"
        ? "Request timed out. Please try again."
        : null) ||
      (!error.response
        ? "Unable to reach the server. Please check your connection."
        : null) ||
      "Something went wrong. Please try again.";
    throw new ApiError(message, {
      status: error.response?.status ?? 0,
      errors: apiError?.errors ?? null,
    });
  },
);

export default apiClient;
