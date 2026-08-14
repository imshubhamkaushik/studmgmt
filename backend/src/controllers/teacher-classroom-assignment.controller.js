import * as s from "../services/teacher-classroom-assignment.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const list = asyncHandler(async (req, res) =>
  res.json({ success: true, data: await s.listAssignments(req.query) }),
);
export const assign = asyncHandler(async (req, res) =>
  res
    .status(201)
    .json({
      success: true,
      data: await s.assignTeacher(req.body, req.requestId, req.user),
    }),
);
export const revoke = asyncHandler(async (req, res) =>
  res.json({
    success: true,
    data: await s.revokeAssignment(req.params.id, req.requestId, req.user),
  }),
);
