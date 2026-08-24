import * as service from "../services/timetable.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const list = asyncHandler(async (req, res) =>
  res.json({ success: true, data: await service.listTimetable(req.query, req.user) }),
);

export const create = asyncHandler(async (req, res) =>
  res.status(201).json({
    success: true,
    data: await service.createTimetableEntry(req.body, req.requestId),
  }),
);

export const remove = asyncHandler(async (req, res) =>
  res.json({
    success: true,
    data: await service.deleteTimetableEntry(req.params.id, req.requestId),
  }),
);
