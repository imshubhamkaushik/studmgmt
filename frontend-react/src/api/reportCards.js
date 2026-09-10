import apiClient from "./client.js";

export const getStudentReportCard = (studentId, academicYearId) =>
  apiClient.get("/report-cards/student", {
    params: { studentId, academicYearId },
    responseType: "blob",
  });

export const generateClassroomReportCards = (classroomId, academicYearId) =>
  apiClient.post("/report-cards/classroom/generate", { classroomId, academicYearId });

export const downloadGeneratedReportCard = (studentId, academicYearId) =>
  apiClient.get(`/report-cards/classroom/download/${studentId}/${academicYearId}`, {
    responseType: "blob",
  });

export const downloadClassroomReportCardsZip = (classroomId, academicYearId) =>
  apiClient.get(`/report-cards/classroom/download-zip/${classroomId}/${academicYearId}`, {
    responseType: "blob",
  });
