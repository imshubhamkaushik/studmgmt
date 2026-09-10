import portalClient from "./portalClient";

export const getMyReportCard = (academicYearId) =>
  portalClient.get("/report-card", { params: { academicYearId }, responseType: "blob" });
