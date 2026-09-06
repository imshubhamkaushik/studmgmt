import apiClient from "./client.js";

export const getExamRoster = (examId) => apiClient.get(`/marks/exam/${examId}/roster`);

export const saveMarks = (examId, entries) => apiClient.post(`/marks/exam/${examId}/bulk`, { entries });
