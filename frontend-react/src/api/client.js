import axios from "axios";

import { ApiError } from "./ApiError";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

if (!API_BASE_URL) {
  throw new Error("VITE_API_BASE_URL is not configured.");
}

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const apiError = error.response?.data;
    const message = apiError?.message
      || (error.code === "ECONNABORTED" ? "Request timed out. Please try again." : null)
      || (!error.response ? "Unable to reach the server. Please check your connection." : null)
      || "Something went wrong. Please try again.";

    return Promise.reject(
      new ApiError(
        message,
        {
          status: error.response?.status ?? 0,
          errors: apiError?.errors ?? null,
        },
      ),
    );
  },
);

export default apiClient;
