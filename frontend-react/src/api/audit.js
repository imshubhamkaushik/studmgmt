import apiClient from "./client.js";

export const getRecentActivity = (limit = 8) =>
  apiClient.get("/audit/recent", { params: { limit } });
