import apiClient from "./client.js";

export const getRecentActivity = (limit = 8) =>
  apiClient.get("/audit/recent", { params: { limit } });

export const getAuditLog = (params = {}) => apiClient.get("/audit", { params });

export const getAuditFilterOptions = () => apiClient.get("/audit/filter-options");
