import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { AssignmentSubmission } from "../models/assignment-submission.model.js";
import { Assignment } from "../models/assignment.model.js";
import { Student } from "../models/student.model.js";
import { Enrollment } from "../models/enrollment.model.js";
import { AppError } from "../utils/AppError.js";
import { writeAudit } from "./audit.service.js";
import { getAssignedClassroomIds } from "./teacher-access.service.js";
import { uploadBufferToS3, sanitizeFilename } from "../utils/s3-storage.js";

const MAX_SUBMISSION_BYTES = 10 * 1024 * 1024; // enforced by S3 itself via the presigned POST condition below

async function assertAssignmentAccess(assignment, user) {
  const assignedIds = await getAssignedClassroomIds(user);
  if (assignedIds !== null && !assignedIds.some((id) => String(id) === String(assignment.classroom)))
    throw new AppError("You are not assigned to this classroom.", 403);
}

// Deliberately NOT built on assertAssignmentAccess/getAssignedClassroomIds
// above — that helper treats any non-"teacher" role as unrestricted
// (see teacher-access.service.js), which would give a portal student
// access to every assignment in the school if reused here. A student's
// authorization is a completely different question: are they actually,
// currently enrolled in this assignment's classroom.
async function assertStudentCanSubmit(assignment, studentId) {
  const isEnrolled = await Enrollment.exists({
    student: studentId,
    classroom: assignment.classroom,
    status: "active",
  });
  if (!isEnrolled) throw new AppError("You are not enrolled in this assignment's classroom.", 403);
}

// Submission records are created (with their own Mongo _id) before the
// presigned POST is generated, so the S3 key can just be keyed by that
// _id directly — process-submission then only has to read one path
// segment out of the S3 event to know which submission an uploaded file
// belongs to, rather than re-deriving it from assignment+student+a
// separate random id.
async function createPendingSubmission(assignment, studentId, originalName, mimeType) {
  const submission = await AssignmentSubmission.findOneAndUpdate(
    { assignment: assignment._id, student: studentId },
    {
      assignment: assignment._id,
      student: studentId,
      file: { originalName, storedPath: "pending", mimeType: mimeType || null, sizeBytes: null, storageType: "s3" },
      submittedAt: new Date(),
      status: "pending_upload",
      rejectionReason: null,
      marksObtained: null,
      feedback: "",
      gradedBy: null,
      gradedAt: null,
    },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
  );

  const key = `submissions/${submission._id}/${sanitizeFilename(originalName)}`;
  submission.file.storedPath = key;
  await submission.save();

  return { submission, key };
}

async function buildUploadResponse(submission, key, { s3Client, bucket }) {
  const presigned = await createPresignedPost(s3Client, {
    Bucket: bucket,
    Key: key,
    Conditions: [["content-length-range", 0, MAX_SUBMISSION_BYTES]],
    Expires: 300,
  });

  return {
    uploadUrl: presigned.url,
    fields: presigned.fields,
    submissionId: submission._id,
    isLate: submission.status === "late",
  };
}

// Staff/teacher recording a submission on a student's behalf (or logging
// a physical submission that gets a scanned copy uploaded after the
// fact) — studentId comes from the request body.
export const requestSubmissionUploadUrlForStaff = async (assignmentId, studentId, { originalName, mimeType }, user, awsClients) => {
  if (!originalName) throw new AppError("originalName is required.", 400);

  const assignment = await Assignment.findById(assignmentId);
  if (!assignment) throw new AppError("Assignment not found.", 404);
  await assertAssignmentAccess(assignment, user);

  const student = await Student.findById(studentId);
  if (!student) throw new AppError("Student not found.", 404);

  const { submission, key } = await createPendingSubmission(assignment, studentId, originalName, mimeType);
  return buildUploadResponse(submission, key, awsClients);
};

// A student uploading their own work through the portal — studentId is
// resolved from their own session by the controller, never taken from
// the request body, so there's no way to submit as someone else.
export const requestSubmissionUploadUrlForStudent = async (assignmentId, studentId, { originalName, mimeType }, awsClients) => {
  if (!originalName) throw new AppError("originalName is required.", 400);

  const assignment = await Assignment.findById(assignmentId);
  if (!assignment) throw new AppError("Assignment not found.", 404);
  await assertStudentCanSubmit(assignment, studentId);

  const { submission, key } = await createPendingSubmission(assignment, studentId, originalName, mimeType);
  return buildUploadResponse(submission, key, awsClients);
};

export const listSubmissions = async (assignmentId, user) => {
  const assignment = await Assignment.findById(assignmentId);
  if (!assignment) throw new AppError("Assignment not found.", 404);
  await assertAssignmentAccess(assignment, user);

  return AssignmentSubmission.find({ assignment: assignmentId })
    .populate("student", "studentId name rollNo")
    .sort({ submittedAt: -1 })
    .lean();
};

// NOTE: studentId is accepted explicitly here rather than derived from the
// session, because student/guardian login doesn't exist yet (see the
// project notes) — staff/teacher/admin record a submission on the
// student's behalf for now (this also legitimately covers logging a
// physical/paper submission). Once student auth lands, add a parallel
// student-facing endpoint that takes studentId from their own session
// instead of the request body, reusing this same function underneath.
export const recordSubmission = async (assignmentId, studentId, file, user, requestId, awsClients) => {
  if (!file) throw new AppError("A file is required for a submission.", 400);
  const assignment = await Assignment.findById(assignmentId);
  if (!assignment) throw new AppError("Assignment not found.", 404);
  await assertAssignmentAccess(assignment, user);

  const student = await Student.findById(studentId);
  if (!student) throw new AppError("Student not found.", 404);

  const isLate = new Date() > assignment.dueDate;

  // Created first (without a confirmed key) purely to get a stable _id to
  // key the S3 object by — same reason createPendingSubmission() above
  // does it for the presigned-upload flow, just without the "pending"
  // intermediate state since the whole file is already in hand here.
  const submission = await AssignmentSubmission.findOneAndUpdate(
    { assignment: assignmentId, student: studentId },
    { assignment: assignmentId, student: studentId },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  const key = `submissions/${submission._id}/${sanitizeFilename(file.originalname)}`;
  await uploadBufferToS3({
    s3Client: awsClients.s3Client,
    bucket: awsClients.bucket,
    key,
    buffer: file.buffer,
    contentType: file.mimetype,
  });

  submission.file = {
    originalName: file.originalname,
    storedPath: key,
    mimeType: file.mimetype,
    sizeBytes: file.size,
    storageType: "s3",
  };
  submission.submittedAt = new Date();
  submission.status = isLate ? "late" : "submitted";
  submission.marksObtained = null;
  submission.feedback = "";
  submission.gradedBy = null;
  submission.gradedAt = null;
  await submission.save();

  await writeAudit({
    entityType: "assignmentSubmission",
    entityId: submission._id,
    action: "SUBMIT",
    changes: { after: { assignment: assignment.title, student: student.name, status: submission.status } },
    requestId,
  });
  return submission;
};

export const gradeSubmission = async (id, input, user, requestId) => {
  const submission = await AssignmentSubmission.findById(id).populate("assignment");
  if (!submission) throw new AppError("Submission not found.", 404);
  await assertAssignmentAccess(submission.assignment, user);

  if (input.marksObtained != null) {
    const marks = Number(input.marksObtained);
    const cap = submission.assignment.maxMarks;
    if (!Number.isFinite(marks) || marks < 0 || (cap != null && marks > cap))
      throw new AppError(`marksObtained must be between 0 and ${cap ?? "the assignment maximum"}.`, 400);
    submission.marksObtained = marks;
  }
  if (input.feedback !== undefined) submission.feedback = String(input.feedback).trim();
  submission.status = "graded";
  submission.gradedBy = user.sub;
  submission.gradedAt = new Date();

  await submission.save();
  await writeAudit({
    entityType: "assignmentSubmission",
    entityId: submission._id,
    action: "GRADE",
    changes: { after: { marksObtained: submission.marksObtained } },
    requestId,
  });
  return submission;
};

export const getSubmissionFilePath = async (id, user, awsClients) => {
  const submission = await AssignmentSubmission.findById(id).populate("assignment").lean();
  if (!submission) throw new AppError("Submission not found.", 404);
  await assertAssignmentAccess(submission.assignment, user);
  if (!submission.file?.storedPath) throw new AppError("This submission has no file.", 404);

  const url = await getSignedUrl(
    awsClients.s3Client,
    new GetObjectCommand({ Bucket: awsClients.bucket, Key: submission.file.storedPath }),
    { expiresIn: 300 },
  );
  return { redirectUrl: url, originalName: submission.file.originalName, mimeType: submission.file.mimeType };
};
