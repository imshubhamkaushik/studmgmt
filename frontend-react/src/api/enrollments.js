import apiClient from "./client.js";
export const getEnrollments = (params = {}) =>
  apiClient.get("/enrollments", { params });
export const createEnrollment = (data) => apiClient.post("/enrollments", data);
export const promoteStudents = (data) =>
  apiClient.post("/enrollments/promote", data);
