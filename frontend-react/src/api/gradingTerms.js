import apiClient from "./client.js";

export const getGradingTerms = (params = {}) => apiClient.get("/grading-terms", { params });

export const createGradingTerm = (data) => apiClient.post("/grading-terms", data);
