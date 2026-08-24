import fs from "node:fs";
import { AssignmentSubmission } from "../models/assignment-submission.model.js";
import { Assignment } from "../models/assignment.model.js";
import { Student } from "../models/student.model.js";
import { AppError } from "../utils/AppError.js";
import { writeAudit } from "./audit.service.js";
import { getAssignedClassroomIds } from "./teacher-access.service.js";
import { absoluteUploadPath, relativeUploadPath } from "../middleware/upload.middleware.js";

async function assertAssignmentAccess(assignment, user) {
  const assignedIds = await getAssignedClassroomIds(user);
  if (assignedIds !== null && !assignedIds.some((id) => String(id) === String(assignment.classroom)))
    throw new AppError("You are not assigned to this classroom.", 403);
}

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
export const recordSubmission = async (assignmentId, studentId, file, user, requestId) => {
  if (!file) throw new AppError("A file is required for a submission.", 400);
  const assignment = await Assignment.findById(assignmentId);
  if (!assignment) throw new AppError("Assignment not found.", 404);
  await assertAssignmentAccess(assignment, user);

  const student = await Student.findById(studentId);
  if (!student) throw new AppError("Student not found.", 404);

  const isLate = new Date() > assignment.dueDate;

  const submission = await AssignmentSubmission.findOneAndUpdate(
    { assignment: assignmentId, student: studentId },
    {
      assignment: assignmentId,
      student: studentId,
      file: {
        originalName: file.originalname,
        storedPath: relativeUploadPath(file.path),
        mimeType: file.mimetype,
        sizeBytes: file.size,
      },
      submittedAt: new Date(),
      status: isLate ? "late" : "submitted",
      marksObtained: null,
      feedback: "",
      gradedBy: null,
      gradedAt: null,
    },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
  );

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
  const path = absoluteUploadPath(submission.file.storedPath);
  if (!fs.existsSync(path)) throw new AppError("The submitted file is no longer available.", 404);
  return { path, originalName: submission.file.originalName, mimeType: submission.file.mimeType };
};
