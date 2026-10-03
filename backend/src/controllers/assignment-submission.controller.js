import { Student } from "../models/student.model.js";
import * as service from "../services/assignment-submission.service.js";
import { sendStoredFile } from "../utils/file-storage.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { AppError } from "../utils/AppError.js";

export const list = asyncHandler(async (req, res) =>
  res.json({
    success: true,
    data: await service.listSubmissions(req.params.assignmentId, req.user),
  }),
);

// Staff/teacher/admin recording a submission on a student's behalf.
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

// Portal-facing — a student uploading their own work. studentId is
// resolved from their session, never from the request body.
export const submitMine = asyncHandler(async (req, res) => {
  const student = await Student.findOne({ studentId: req.portalUser.studentId }).select("_id").lean();
  if (!student) throw new AppError("Student record not found.", 404);

  const data = await service.recordStudentSubmission(req.params.assignmentId, student._id, req.file);
  res.status(201).json({ success: true, data });
});

export const grade = asyncHandler(async (req, res) =>
  res.json({
    success: true,
    data: await service.gradeSubmission(req.params.id, req.body, req.user, req.requestId),
  }),
);

export const downloadFile = asyncHandler(async (req, res) => {
  const file = await service.getSubmissionFilePath(req.params.id, req.user);
  await sendStoredFile(res, file);
});
