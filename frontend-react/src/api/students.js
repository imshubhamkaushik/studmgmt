import apiClient from "./client";

export const getStudents = (params) => apiClient.get("/students", { params });

export const getStudentById = (id) => apiClient.get(`/students/${id}`);

export const createStudent = (studentData) =>
  apiClient.post("/students", studentData);

export const updateStudent = (id, studentData) =>
  apiClient.patch(`/students/${id}`, studentData);

export const deleteStudent = (id) => apiClient.delete(`/students/${id}`);

export const checkStudentAvailability = (params) =>
  apiClient.get("/students/check-availability", { params });

export const restoreStudent = (id) => apiClient.post(`/students/${id}/restore`);

export const bulkUpdateStudents = (payload) =>
  apiClient.patch("/students/bulk", payload);

export const getStudentFilterOptions = (params = {}) =>
  apiClient.get("/students/filter-options", { params });

export const importStudents = (students) =>
  apiClient.post("/students/import", { students });

export const exportStudents = (params) =>
  apiClient.get("/students/export", { params, responseType: "blob" });

export const getStudentAuditHistory = (id) =>
  apiClient.get(`/students/${id}/audit`);
