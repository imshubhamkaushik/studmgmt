import { MarkEntry } from "../models/mark-entry.model.js";
import { Exam } from "../models/exam.model.js";
import { Enrollment } from "../models/enrollment.model.js";
import { AppError } from "../utils/AppError.js";
import { writeAudit } from "./audit.service.js";
import { getAssignedClassroomIds } from "./teacher-access.service.js";
import { notifyStudent } from "./notification.service.js";
import { maybeAutoGenerateReportCards } from "./report-card.service.js";

// Grade computation lives in its own module now — report-card.service.js
// needs it too, and this file needing to call *into* report-card.service.js
// (below, to auto-generate report cards once a term's grading is complete)
// would otherwise create a circular import between the two.
export { computeSubjectGrade, computeReportCard } from "./grade-calculation.service.js";

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

  // Best-effort — a notification failure should never roll back marks
  // that were already saved successfully.
  await Promise.allSettled(
    results.map((record) =>
      notifyStudent(record.student, {
        type: "grade_posted",
        title: "New grade posted",
        body: `A new grade was recorded for ${exam.name}.`,
      }),
    ),
  );

  // Awaited rather than fire-and-forget: for a classroom-sized batch this
  // adds real latency to the response, but it keeps the trigger
  // deterministic and testable. This exact block — "generate N PDFs and
  // notify N people, synchronously, inside a request handler" — is the
  // piece that becomes an EventBridge + Lambda hand-off once this app
  // moves onto AWS; for now, correctness wins over shaving milliseconds.
  await maybeAutoGenerateReportCards(exam);

  return results;
};
