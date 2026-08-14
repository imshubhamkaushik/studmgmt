import * as service from "../services/academic-year.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const list = asyncHandler(async (req, res) =>
  res.json({ success: true, data: await service.listAcademicYears() }),
);
export const create = asyncHandler(async (req, res) =>
  res
    .status(201)
    .json({
      success: true,
      data: await service.createAcademicYear(req.body, req.requestId),
    }),
);
export const update = asyncHandler(async (req, res) =>
  res.json({
    success: true,
    data: await service.updateAcademicYear(
      req.params.id,
      req.body,
      req.requestId,
    ),
  }),
);
export const setActive = asyncHandler(async (req, res) =>
  res.json({
    success: true,
    data: await service.setActiveAcademicYear(req.params.id, req.requestId),
  }),
);
