import * as service from "../services/assignment.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const list = asyncHandler(async (req, res) =>
  res.json({ success: true, data: await service.listAssignments(req.query, req.user) }),
);

export const create = asyncHandler(async (req, res) =>
  res.status(201).json({
    success: true,
    data: await service.createAssignment(req.body, req.file, req.user, req.requestId),
  }),
);

export const update = asyncHandler(async (req, res) =>
  res.json({
    success: true,
    data: await service.updateAssignment(req.params.id, req.body, req.user, req.requestId),
  }),
);

export const downloadAttachment = asyncHandler(async (req, res) => {
  const { path, originalName, mimeType } = await service.getAssignmentAttachmentPath(req.params.id, req.user);
  res.setHeader("Content-Type", mimeType || "application/octet-stream");
  res.download(path, originalName);
});
