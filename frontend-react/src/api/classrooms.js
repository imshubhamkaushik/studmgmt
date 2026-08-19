import apiClient from "./client.js";

export const getClassrooms = (params = {}) =>
  apiClient.get("/classrooms", { params });

export const createClassroom = (data) => apiClient.post("/classrooms", data);

export const generateDefaultClassrooms = (academicYear) =>
  apiClient.post("/classrooms/generate-defaults", { academicYear });
