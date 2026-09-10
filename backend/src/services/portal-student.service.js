import { Student } from "../models/student.model.js";
import { Enrollment } from "../models/enrollment.model.js";
import { AcademicYear } from "../models/academic-year.model.js";
import { Attendance } from "../models/attendance.model.js";
import { Assignment } from "../models/assignment.model.js";
import { AssignmentSubmission } from "../models/assignment-submission.model.js";
import { AppError } from "../utils/AppError.js";

// req.portalUser.studentId is the human-readable student code shared by
// both actor types (student and guardian) — see portal-auth.middleware.js.
// Every function here resolves that to the actual Student document first,
// then scopes everything else to it. A guardian never sees any student
// but the one their account is tied to, because there is no other way
// into this module — the studentId comes from their own signed token,
// never from a request parameter a guardian could edit.
async function resolveStudent(portalUser) {
  const student = await Student.findOne({ studentId: portalUser.studentId }).lean();
  if (!student || student.isDeleted) throw new AppError("Student record not found.", 404);
  return student;
}

async function resolveCurrentEnrollment(studentId) {
  const activeYear = await AcademicYear.findOne({ isActive: true }).lean();
  if (activeYear) {
    const enrollment = await Enrollment.findOne({ student: studentId, academicYear: activeYear._id, status: "active" })
      .populate("classroom", "className section")
      .populate("academicYear", "name isActive")
      .lean();
    if (enrollment) return enrollment;
  }
  // Fall back to the most recently started enrollment if there's no
  // active academic year yet, or the student has no row in it (e.g.
  // between promotion and the new year opening).
  return Enrollment.findOne({ student: studentId })
    .sort({ startDate: -1 })
    .populate("classroom", "className section")
    .populate("academicYear", "name isActive")
    .lean();
}

export const getMyProfile = async (portalUser) => {
  const student = await resolveStudent(portalUser);
  const [currentEnrollment, academicYears] = await Promise.all([
    resolveCurrentEnrollment(student._id),
    Enrollment.find({ student: student._id })
      .populate("academicYear", "name isActive")
      .sort({ startDate: -1 })
      .lean()
      .then((rows) => {
        // Dedup — a student can have at most one enrollment per academic
        // year (unique index), but populate + map keeps this explicit
        // rather than assuming that invariant holds forever.
        const seen = new Set();
        return rows
          .map((r) => r.academicYear)
          .filter((y) => y && !seen.has(String(y._id)) && seen.add(String(y._id)));
      }),
  ]);

  return {
    student: {
      studentId: student.studentId,
      name: student.name,
      dob: student.dob,
      status: student.status,
    },
    currentEnrollment: currentEnrollment
      ? {
          classroom: currentEnrollment.classroom,
          academicYear: currentEnrollment.academicYear,
          rollNo: currentEnrollment.rollNo,
        }
      : null,
    academicYears,
  };
};

export const getMyAttendance = async (portalUser, query = {}) => {
  const student = await resolveStudent(portalUser);

  const filter = { student: student._id };
  if (query.month) {
    // "month" arrives as "YYYY-MM" from the frontend's month picker.
    const [year, month] = String(query.month).split("-").map(Number);
    if (!year || !month) throw new AppError("month must be in YYYY-MM format.", 400);
    filter.date = { $gte: new Date(Date.UTC(year, month - 1, 1)), $lt: new Date(Date.UTC(year, month, 1)) };
  }

  const records = await Attendance.find(filter).sort({ date: -1 }).limit(93).lean();
  const summary = records.reduce(
    (acc, r) => ({ ...acc, [r.status]: (acc[r.status] || 0) + 1 }),
    {},
  );
  return { records, summary, total: records.length };
};

export const getMyAssignments = async (portalUser) => {
  const student = await resolveStudent(portalUser);
  const enrollment = await resolveCurrentEnrollment(student._id);
  if (!enrollment) return [];

  const [assignments, submissions] = await Promise.all([
    Assignment.find({ classroom: enrollment.classroom._id, isArchived: { $ne: true } })
      .populate("subject", "name code")
      .sort({ dueDate: 1 })
      .lean(),
    AssignmentSubmission.find({ student: student._id }).lean(),
  ]);

  const submissionByAssignment = new Map(submissions.map((s) => [String(s.assignment), s]));

  return assignments.map((a) => {
    const submission = submissionByAssignment.get(String(a._id)) || null;
    return {
      _id: a._id,
      title: a.title,
      description: a.description,
      subject: a.subject,
      dueDate: a.dueDate,
      maxMarks: a.maxMarks,
      hasAttachment: Boolean(a.attachment?.storedPath),
      submission: submission
        ? {
            _id: submission._id,
            status: submission.status,
            submittedAt: submission.submittedAt,
            marksObtained: submission.marksObtained,
            feedback: submission.feedback,
            hasFile: Boolean(submission.file?.storedPath),
          }
        : null,
    };
  });
};
