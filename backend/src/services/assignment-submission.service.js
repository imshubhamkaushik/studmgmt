import { AssignmentSubmission } from "../models/assignment-submission.model.js";
import { Assignment } from "../models/assignment.model.js";
import { Student } from "../models/student.model.js";
import { Enrollment } from "../models/enrollment.model.js";
import { AppError } from "../utils/AppError.js";
import { writeAudit } from "./audit.service.js";
import { getAssignedClassroomIds } from "./teacher-access.service.js";
import { saveBuffer, sanitizeFilename } from "../utils/file-storage.js";
import { notifyUser } from "./notification.service.js";

const MAX_SUBMISSION_BYTES = 10 * 1024 * 1024; // portal (student) uploads only; staff uploads use the global 15MB multer limit

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

// Writes the uploaded file to local disk and upserts the one submission row
// for this assignment+student. The submission is created first (without a
// confirmed file) purely to get a stable _id to build the storage path
// from. Resubmitting replaces the file and clears any previous grade.
async function storeSubmissionFile(assignment, studentId, file) {
  const isLate = new Date() > assignment.dueDate;

  const submission = await AssignmentSubmission.findOneAndUpdate(
    { assignment: assignment._id, student: studentId },
    { assignment: assignment._id, student: studentId },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  const key = `submissions/${submission._id}/${sanitizeFilename(file.originalname)}`;
  await saveBuffer({ key, buffer: file.buffer });

  submission.file = {
    originalName: file.originalname,
    storedPath: key,
    mimeType: file.mimetype,
    sizeBytes: file.size,
    storageType: "local",
  };
  submission.submittedAt = new Date();
  submission.status = isLate ? "late" : "submitted";
  submission.rejectionReason = null;
  submission.marksObtained = null;
  submission.feedback = "";
  submission.gradedBy = null;
  submission.gradedAt = null;
  await submission.save();

  return submission;
}

// A student uploading their own work through the portal — studentId is
// resolved from their own session by the controller, never taken from the
// request body, so there's no way to submit as someone else.
export const recordStudentSubmission = async (assignmentId, studentId, file) => {
  if (!file) throw new AppError("A file is required for a submission.", 400);
  if (file.size > MAX_SUBMISSION_BYTES) throw new AppError("File is too large. Maximum size is 10MB.", 400);

  const assignment = await Assignment.findById(assignmentId);
  if (!assignment) throw new AppError("Assignment not found.", 404);
  await assertStudentCanSubmit(assignment, studentId);

  const submission = await storeSubmissionFile(assignment, studentId, file);

  // Best-effort — a notification failure shouldn't undo a submission that
  // was already recorded successfully.
  const student = await Student.findById(studentId).select("name").lean();
  await notifyUser(assignment.teacher, {
    type: "submission_received",
    title: "New submission received",
    body: `${student?.name || "A student"} submitted "${assignment.title}".`,
  }).catch(() => {});

  return submission;
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

// Staff/teacher/admin record a submission on a student's behalf (this also
// legitimately covers logging a physical/paper submission). studentId
// comes from the request body; students submit their own work through
// recordStudentSubmission above instead.
export const recordSubmission = async (assignmentId, studentId, file, user, requestId) => {
  if (!file) throw new AppError("A file is required for a submission.", 400);
  const assignment = await Assignment.findById(assignmentId);
  if (!assignment) throw new AppError("Assignment not found.", 404);
  await assertAssignmentAccess(assignment, user);

  const student = await Student.findById(studentId);
  if (!student) throw new AppError("Student not found.", 404);

  const submission = await storeSubmissionFile(assignment, studentId, file);

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

export const getSubmissionFilePath = async (id, user) => {
  const submission = await AssignmentSubmission.findById(id).populate("assignment").lean();
  if (!submission) throw new AppError("Submission not found.", 404);
  await assertAssignmentAccess(submission.assignment, user);
  if (!submission.file?.storedPath) throw new AppError("This submission has no file.", 404);

  return {
    key: submission.file.storedPath,
    originalName: submission.file.originalName,
    mimeType: submission.file.mimeType,
  };
};
