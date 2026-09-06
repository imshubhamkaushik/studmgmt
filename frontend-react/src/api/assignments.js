import apiClient from "./client.js";

export const getAssignments = (params = {}) => apiClient.get("/assignments", { params });

export const createAssignment = (data) => apiClient.post("/assignments", data);
