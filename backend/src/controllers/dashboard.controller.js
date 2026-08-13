import { asyncHandler } from "../utils/asyncHandler.js";
import { getDashboardStats as getDashboardStatsService } from "../services/dashboard.service.js";

export const getDashboardStats = asyncHandler(async (req, res) => {
  const stats = await getDashboardStatsService();

  res.status(200).json({
    success: true,
    data: stats,
  });
});
