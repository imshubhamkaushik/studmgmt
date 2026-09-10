import { getRecentActivity, listAuditLog, getAuditFilterOptions } from "../services/audit.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const getRecent = asyncHandler(async (req, res) => {
  const activity = await getRecentActivity(req.query.limit);
  res.status(200).json({ success: true, data: activity });
});

export const list = asyncHandler(async (req, res) => {
  const result = await listAuditLog(req.query);
  res.status(200).json({ success: true, data: result });
});

export const getFilterOptions = asyncHandler(async (req, res) => {
  const options = await getAuditFilterOptions();
  res.status(200).json({ success: true, data: options });
});
