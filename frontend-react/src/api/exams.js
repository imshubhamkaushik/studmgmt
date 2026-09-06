import apiClient from "./client.js";

export const getExams = (params = {}) => apiClient.get("/exams", { params });

export const createExam = (data) => apiClient.post("/exams", data);
