import { MarkEntry } from "../models/mark-entry.model.js";
import { Exam } from "../models/exam.model.js";
import { GradingTerm } from "../models/grading-term.model.js";
import { Enrollment } from "../models/enrollment.model.js";
import { AppError } from "../utils/AppError.js";
import { writeAudit } from "./audit.service.js";
import { getAssignedClassroomIds } from "./teacher-access.service.js";

async function assertExamAccess(exam, user) {
  const assignedIds = await getAssignedClassroomIds(user);
  if (assignedIds !== null && !assignedIds.some((id) => String(id) === String(exam.classroom)))
    throw new AppError("You are not assigned to this classroom.", 403);
}

// Every student currently enrolled in the exam's classroom, joined with
// whatever mark has been entered for them so far (null if not yet
// entered) — this is what the mark-entry screen and the CSV template
// are both built from.
export const getExamRoster = async (examId, user) => {
  const exam = await Exam.findById(examId).populate("classroom", "className section");
  if (!exam) throw new AppError("Exam not found.", 404);
  await assertExamAccess(exam, user);

  const [enrollments, marks] = await Promise.all([
    Enrollment.find({ classroom: exam.classroom._id, academicYear: exam.academicYear, status: "active" })
      .populate("student", "studentId name rollNo")
      .sort({ rollNo: 1 })
      .lean(),
    MarkEntry.find({ exam: examId }).lean(),
  ]);

  const marksByStudent = new Map(marks.map((m) => [String(m.student), m]));

  return {
    exam,
    roster: enrollments
      .filter((e) => e.student)
      .map((e) => ({
        student: e.student,
        rollNo: e.rollNo,
        mark: marksByStudent.get(String(e.student._id)) || null,
      })),
  };
};

export const bulkUpsertMarks = async (examId, entries, user, requestId) => {
  if (!Array.isArray(entries) || !entries.length || entries.length > 300)
    throw new AppError("entries must contain between 1 and 300 items.", 400);

  const exam = await Exam.findById(examId);
  if (!exam) throw new AppError("Exam not found.", 404);
  await assertExamAccess(exam, user);

  const results = [];
  for (const entry of entries) {
    if (!entry.studentId) throw new AppError("Each entry requires studentId.", 400);
    const isAbsent = Boolean(entry.isAbsent);
    if (!isAbsent) {
      const marks = Number(entry.marksObtained);
      if (!Number.isFinite(marks) || marks < 0 || marks > exam.maxMarks)
        throw new AppError(
          `Marks for student ${entry.studentId} must be between 0 and ${exam.maxMarks}.`,
          400,
        );
    }

    const record = await MarkEntry.findOneAndUpdate(
      { exam: examId, student: entry.studentId },
      {
        exam: examId,
        student: entry.studentId,
        marksObtained: isAbsent ? null : Number(entry.marksObtained),
        isAbsent,
        remarks: entry.remarks ? String(entry.remarks).trim() : "",
        enteredBy: user?.sub || null,
      },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
    );
    results.push(record);
  }

  await writeAudit({
    entityType: "markEntry",
    entityId: exam._id,
    action: "BULK_ENTER",
    changes: { after: { exam: exam.name, count: results.length } },
    requestId,
  });

  return results;
};

// The weighted grade computation: for each grading term in the academic
// year, find the student's exam for this subject in that term, take their
// percentage, and combine the terms weighted by each term's weightPercent.
// A term the student has no exam/mark for yet is simply excluded — the
// result reflects "graded so far", not a zero for ungraded work.
export const computeSubjectGrade = async (studentId, subjectId, academicYearId) => {
  const terms = await GradingTerm.find({ academicYear: academicYearId, isArchived: { $ne: true } }).lean();
  if (!terms.length) return { percent: null, breakdown: [] };

  const exams = await Exam.find({
    academicYear: academicYearId,
    subject: subjectId,
    gradingTerm: { $in: terms.map((t) => t._id) },
    isArchived: { $ne: true },
  }).lean();

  const examIds = exams.map((e) => e._id);
  const marks = await MarkEntry.find({ exam: { $in: examIds }, student: studentId }).lean();
  const markByExam = new Map(marks.map((m) => [String(m.exam), m]));

  const breakdown = [];
  let weightedSum = 0;
  let weightUsed = 0;

  for (const term of terms) {
    const exam = exams.find((e) => String(e.gradingTerm) === String(term._id));
    if (!exam) continue;
    const mark = markByExam.get(String(exam._id));
    if (!mark || mark.isAbsent || mark.marksObtained == null) {
      breakdown.push({ term: term.name, weightPercent: term.weightPercent, examPercent: null, status: mark?.isAbsent ? "absent" : "not entered" });
      continue;
    }
    const examPercent = (mark.marksObtained / exam.maxMarks) * 100;
    breakdown.push({ term: term.name, weightPercent: term.weightPercent, examPercent: Math.round(examPercent * 100) / 100, status: "graded" });
    weightedSum += examPercent * term.weightPercent;
    weightUsed += term.weightPercent;
  }

  const percent = weightUsed > 0 ? Math.round((weightedSum / weightUsed) * 100) / 100 : null;
  return { percent, weightGraded: weightUsed, weightTotal: terms.reduce((s, t) => s + t.weightPercent, 0), breakdown };
};

export const computeReportCard = async (studentId, academicYearId, subjects) => {
  const results = [];
  for (const subject of subjects) {
    const grade = await computeSubjectGrade(studentId, subject._id, academicYearId);
    results.push({ subject: { _id: subject._id, name: subject.name, code: subject.code }, ...grade });
  }
  return results;
};
