import axios from "axios";
import { ApiError } from "../../api/ApiError";
import { getPortalAccessToken, setPortalAccessToken } from "../auth/tokenStore";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

if (!API_BASE_URL) throw new Error("VITE_API_BASE_URL is not configured.");

const portalClient = axios.create({
  baseURL: `${API_BASE_URL.replace(/\/$/, "")}/portal`,
  timeout: 10000,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

let refreshPromise = null;

portalClient.interceptors.request.use((config) => {
  const token = getPortalAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Exchanges the HttpOnly portal_refresh_token cookie (scoped to
// /api/v1/portal/auth, distinct from the staff refresh cookie's path) for
// a new short-lived portal access token.
export async function refreshPortalAccessToken() {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(
        `${API_BASE_URL.replace(/\/$/, "")}/portal/auth/refresh`,
        {},
        { withCredentials: true, timeout: 10000, headers: { "Content-Type": "application/json" } },
      )
      .then((r) => r.data?.data?.accessToken)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

portalClient.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const original = error.config || {};
    const url = String(original.url || "");
    const isAuthEndpoint = url.includes("/auth/login") || url.includes("/auth/refresh");

    if (error.response?.status === 401 && !original._retry && !isAuthEndpoint) {
      original._retry = true;
      try {
        const token = await refreshPortalAccessToken();
        if (!token) throw new Error("No refreshed token returned");

        setPortalAccessToken(token);
        original.headers ??= {};
        original.headers.Authorization = `Bearer ${token}`;
        return portalClient(original);
      } catch {
        setPortalAccessToken(null);
        window.dispatchEvent(new Event("portal-auth:expired"));
      }
    }

    const apiError = error.response?.data;
    const message =
      apiError?.message ||
      (error.code === "ECONNABORTED" ? "Request timed out. Please try again." : null) ||
      (!error.response ? "Unable to reach the server. Please check your connection." : null) ||
      "Something went wrong. Please try again.";
    throw new ApiError(message, { status: error.response?.status ?? 0, errors: apiError?.errors ?? null });
  },
);

export default portalClient;
