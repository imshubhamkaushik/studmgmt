import apiClient from "./client";

export const getTimetable = (params) => apiClient.get("/timetable", { params });
