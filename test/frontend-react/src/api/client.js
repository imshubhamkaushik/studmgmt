import axios from "axios";

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

    return Promise.reject({
      status: error.response?.status ?? 0,
      message: apiError?.message || "Something went wrong. Please try again.",
      errors: apiError?.errors ?? null,
    });
  },
);

export default apiClient;
