import apiClient from "./client";

export const getAcademicYears = () => apiClient.get("/academic-years");

export const createAcademicYear = (data) =>
  apiClient.post("/academic-years", data);

export const activateAcademicYear = (id) =>
  apiClient.post(`/academic-years/${id}/activate`);
