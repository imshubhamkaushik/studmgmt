import * as service from "../services/portal-student.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const getMyProfile = asyncHandler(async (req, res) =>
  res.json({ success: true, data: await service.getMyProfile(req.portalUser) }),
);

export const getMyAttendance = asyncHandler(async (req, res) =>
  res.json({ success: true, data: await service.getMyAttendance(req.portalUser, req.query) }),
);

export const getMyAssignments = asyncHandler(async (req, res) =>
  res.json({ success: true, data: await service.getMyAssignments(req.portalUser) }),
);
