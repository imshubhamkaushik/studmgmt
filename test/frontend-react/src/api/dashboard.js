import apiClient from "./client";

export const getDashboardStats = () => apiClient.get("/dashboard");
