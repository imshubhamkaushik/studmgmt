import * as service from "../services/assignment-submission.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { AppError } from "../utils/AppError.js";

export const list = asyncHandler(async (req, res) =>
  res.json({
    success: true,
    data: await service.listSubmissions(req.params.assignmentId, req.user),
  }),
);

export const submit = asyncHandler(async (req, res) => {
  if (!req.body.studentId) throw new AppError("studentId is required.", 400);
  res.status(201).json({
    success: true,
    data: await service.recordSubmission(
      req.params.assignmentId,
      req.body.studentId,
      req.file,
      req.user,
      req.requestId,
    ),
  });
});

export const grade = asyncHandler(async (req, res) =>
  res.json({
    success: true,
    data: await service.gradeSubmission(req.params.id, req.body, req.user, req.requestId),
  }),
);

export const downloadFile = asyncHandler(async (req, res) => {
  const { path, originalName, mimeType } = await service.getSubmissionFilePath(req.params.id, req.user);
  res.setHeader("Content-Type", mimeType || "application/octet-stream");
  res.download(path, originalName);
});
