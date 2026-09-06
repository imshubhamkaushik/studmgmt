import { S3Client } from "@aws-sdk/client-s3";
import { Student } from "../models/student.model.js";
import * as service from "../services/assignment-submission.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { AppError } from "../utils/AppError.js";

// Constructed once at module load, reused across requests.
const s3Client = new S3Client({});
const awsClients = () => ({ s3Client, bucket: process.env.SUBMISSIONS_BUCKET });

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

// Staff issuing a presigned upload on a student's behalf.
export const getUploadUrl = asyncHandler(async (req, res) => {
  if (!req.body.studentId) throw new AppError("studentId is required.", 400);
  const data = await service.requestSubmissionUploadUrlForStaff(
    req.params.assignmentId,
    req.body.studentId,
    { originalName: req.body.originalName, mimeType: req.body.mimeType },
    req.user,
    awsClients(),
  );
  res.status(200).json({ success: true, data });
});

// Portal-facing — a student uploading their own work. studentId is
// resolved from their session, never from the request body.
export const getMyUploadUrl = asyncHandler(async (req, res) => {
  const student = await Student.findOne({ studentId: req.portalUser.studentId }).select("_id").lean();
  if (!student) throw new AppError("Student record not found.", 404);

  const data = await service.requestSubmissionUploadUrlForStudent(
    req.params.assignmentId,
    student._id,
    { originalName: req.body.originalName, mimeType: req.body.mimeType },
    awsClients(),
  );
  res.status(200).json({ success: true, data });
});

export const grade = asyncHandler(async (req, res) =>
  res.json({
    success: true,
    data: await service.gradeSubmission(req.params.id, req.body, req.user, req.requestId),
  }),
);

export const downloadFile = asyncHandler(async (req, res) => {
  const result = await service.getSubmissionFilePath(req.params.id, req.user, awsClients());

  if (result.redirectUrl) {
    // S3-stored submission — the presigned URL itself streams the file;
    // this process never touches the bytes.
    return res.redirect(302, result.redirectUrl);
  }

  res.setHeader("Content-Type", result.mimeType || "application/octet-stream");
  res.download(result.path, result.originalName);
});
