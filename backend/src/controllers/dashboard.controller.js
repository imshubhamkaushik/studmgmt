import { getDashboardStats as getDashboardStatsService } from "../services/dashboard.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const getDashboardStats = asyncHandler(async (req, res) => {
  const stats = await getDashboardStatsService(req.query);
  res.status(200).json({ success: true, data: stats });
});
