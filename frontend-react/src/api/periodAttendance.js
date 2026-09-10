import apiClient from "./client";

export const getPeriodRoster = (timetableEntryId, date) =>
  apiClient.get(`/period-attendance/${timetableEntryId}/roster`, { params: { date } });

export const markPeriodAttendance = (timetableEntryId, payload) =>
  apiClient.post(`/period-attendance/${timetableEntryId}/mark`, payload);
