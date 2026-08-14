import * as service from "../services/classroom.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const list = asyncHandler(async (req, res) =>
  res.json({ success: true, data: await service.listClassrooms(req.query) }),
);
export const create = asyncHandler(async (req, res) =>
  res
    .status(201)
    .json({
      success: true,
      data: await service.createClassroom(req.body, req.requestId),
    }),
);
export const update = asyncHandler(async (req, res) =>
  res.json({
    success: true,
    data: await service.updateClassroom(req.params.id, req.body, req.requestId),
  }),
);
