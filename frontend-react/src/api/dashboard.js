import apiClient from "./client";

export const getDashboardStats = ({ range = "all" } = {}) =>
  apiClient.get("/dashboard/stats", { params: { range } });
