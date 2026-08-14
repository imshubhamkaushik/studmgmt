import apiClient from "./client";

export const getAttendance = (params) =>
  apiClient.get("/attendance", { params });

export const markBulkAttendance = (payload) =>
  apiClient.post("/attendance/bulk", payload);

export const getAttendanceSummary = (params) =>
  apiClient.get("/attendance/summary", { params });

export const getStudentAttendanceHistory = (studentId, params) =>
  apiClient.get(`/attendance/student/${studentId}`, { params });
