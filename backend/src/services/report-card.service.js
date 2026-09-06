import fs from "node:fs";
import path from "node:path";
import { Student } from "../models/student.model.js";
import { Enrollment } from "../models/enrollment.model.js";
import { Exam } from "../models/exam.model.js";
import { Subject } from "../models/subject.model.js";
import { MarkEntry } from "../models/mark-entry.model.js";
import { AppError } from "../utils/AppError.js";
import { computeReportCard } from "./grade-calculation.service.js";
import { renderReportCardPdf } from "../utils/report-card-pdf.js";
import { notifyStudent } from "./notification.service.js";
import { absoluteUploadPath } from "../middleware/upload.middleware.js";

// Only subjects that actually have an exam for this classroom+academic
// year are included — not every active Subject in the system, since
// subjects aren't tied to a classroom directly (they're joined through
// Exam), and a classroom's report card shouldn't list subjects it was
// never examined on.
async function subjectsTaughtToClassroom(classroomId, academicYearId) {
  const subjectIds = await Exam.distinct("subject", { classroom: classroomId, academicYear: academicYearId });
  return Subject.find({ _id: { $in: subjectIds } }).sort({ name: 1 }).lean();
}

// Pure — deliberately kept free of any DB access so it can be unit tested
// without a database connection.
export const computeOverallPercent = (grades) => {
  const graded = grades.filter((g) => g.percent != null);
  if (!graded.length) return null;
  return Math.round((graded.reduce((sum, g) => sum + g.percent, 0) / graded.length) * 100) / 100;
};

export const buildReportCardData = async (studentId, academicYearId) => {
  const [student, enrollment] = await Promise.all([
    Student.findById(studentId).lean(),
    Enrollment.findOne({ student: studentId, academicYear: academicYearId })
      .populate("classroom", "className section")
      .lean(),
  ]);
  if (!student) throw new AppError("Student not found.", 404);
  if (!enrollment) throw new AppError("Student is not enrolled for this academic year.", 404);

  const subjects = await subjectsTaughtToClassroom(enrollment.classroom._id, academicYearId);
  const grades = await computeReportCard(studentId, academicYearId, subjects);

  return {
    student: { name: student.name, studentId: student.studentId, rollNo: enrollment.rollNo },
    classroom: enrollment.classroom
      ? `${enrollment.classroom.className}${enrollment.classroom.section ? " - " + enrollment.classroom.section : ""}`
      : null,
    subjects: grades,
    overallPercent: computeOverallPercent(grades),
  };
};

export const generateReportCardPdf = async (studentId, academicYearId) => {
  const data = await buildReportCardData(studentId, academicYearId);
  const buffer = await renderReportCardPdf(data);
  return { buffer, data };
};

function storedPathFor(studentId, academicYearId) {
  return `report-cards/${academicYearId}/${studentId}.pdf`;
}

// Generates a report card for every actively enrolled student in a
// classroom, writes each PDF to disk (same uploads root and path-traversal
// guard as assignment submissions), and fires a "report_card_ready"
// notification per student. This is the batch job that becomes the S3 +
// Lambda candidate once this moves onto AWS — it's already shaped that way.
export const generateReportCardsForClassroom = async (classroomId, academicYearId) => {
  const enrollments = await Enrollment.find({ classroom: classroomId, academicYear: academicYearId, status: "active" })
    .populate("student", "name studentId")
    .sort({ rollNo: 1 })
    .lean();
  if (!enrollments.length)
    throw new AppError("No active enrollments found for this classroom and academic year.", 404);

  const results = [];
  for (const enrollment of enrollments) {
    const { buffer, data } = await generateReportCardPdf(enrollment.student._id, academicYearId);

    const storedPath = storedPathFor(enrollment.student._id, academicYearId);
    const absPath = absoluteUploadPath(storedPath);
    fs.mkdirSync(path.dirname(absPath), { recursive: true });
    fs.writeFileSync(absPath, buffer);

    // Best-effort — a notification failure shouldn't undo a report card
    // that was already generated and saved successfully.
    await notifyStudent(enrollment.student._id, {
      type: "report_card_ready",
      title: "Your report card is ready",
      body: `Your report card is ready to view${data.overallPercent != null ? ` \u2014 overall ${data.overallPercent}%` : ""}.`,
    }).catch(() => {});

    results.push({
      studentId: enrollment.student._id,
      studentName: enrollment.student.name,
      overallPercent: data.overallPercent,
    });
  }
  return results;
};

export const readGeneratedReportCard = (studentId, academicYearId) => {
  const absPath = absoluteUploadPath(storedPathFor(studentId, academicYearId));
  if (!fs.existsSync(absPath)) throw new AppError("Report card has not been generated yet.", 404);
  return fs.readFileSync(absPath);
};

// True once every exam under this classroom + grading term (e.g. every
// subject's "Mid-Term" exam) has a mark entry for every actively enrolled
// student. This is the signal that a term's grading is actually finished
// for this classroom — checking after a single exam's marks are saved
// would fire once per subject instead of once per term.
async function isGradingTermCompleteForClassroom(classroomId, academicYearId, gradingTermId) {
  const exams = await Exam.find({
    classroom: classroomId,
    academicYear: academicYearId,
    gradingTerm: gradingTermId,
    isArchived: { $ne: true },
  })
    .select("_id")
    .lean();
  if (!exams.length) return false;

  const enrollments = await Enrollment.find({ classroom: classroomId, academicYear: academicYearId, status: "active" })
    .select("_id")
    .lean();
  if (!enrollments.length) return false;

  const examIds = exams.map((e) => e._id);
  const expected = exams.length * enrollments.length;
  const actual = await MarkEntry.countDocuments({ exam: { $in: examIds } });
  return actual >= expected;
}

// Called by mark-entry.service.js right after marks are saved for one
// exam. If that completes the exam's grading term for its classroom,
// report cards are regenerated and re-sent for every student in that
// classroom automatically — no manual "generate" step required. Never
// throws: a failure here must never surface as a failure of the
// mark-entry request that triggered it.
export const maybeAutoGenerateReportCards = async (exam) => {
  try {
    const complete = await isGradingTermCompleteForClassroom(exam.classroom, exam.academicYear, exam.gradingTerm);
    if (!complete) return { generated: false };
    const results = await generateReportCardsForClassroom(exam.classroom, exam.academicYear);
    return { generated: true, count: results.length };
  } catch {
    return { generated: false };
  }
};
