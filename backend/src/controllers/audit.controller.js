import { getRecentActivity } from "../services/audit.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const getRecent = asyncHandler(async (req, res) => {
  const activity = await getRecentActivity(req.query.limit);
  res.status(200).json({ success: true, data: activity });
});
