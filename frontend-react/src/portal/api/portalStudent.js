import portalClient from "./portalClient";

export const getMyProfile = () => portalClient.get("/student/profile");
export const getMyAttendance = (month) =>
  portalClient.get("/student/attendance", { params: month ? { month } : undefined });
export const getMyAssignments = () => portalClient.get("/student/assignments");
