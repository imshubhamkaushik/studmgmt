import apiClient from "./client";

export const getStudents = (params) =>
  apiClient.get("/students", {
    params,
  });

export const getStudentById = (id) => apiClient.get(`/students/${id}`);

export const createStudent = (studentData) =>
  apiClient.post("/students", studentData);

export const updateStudent = (id, studentData) =>
  apiClient.patch(`/students/${id}`, studentData);

export const deleteStudent = (id) => apiClient.delete(`/students/${id}`);
