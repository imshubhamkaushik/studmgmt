import { MarkEntry } from "../models/mark-entry.model.js";
import { Exam } from "../models/exam.model.js";
import { GradingTerm } from "../models/grading-term.model.js";

// The weighted grade computation: for each grading term in the academic
// year, find the student's exam for this subject in that term, take their
// percentage, and combine the terms weighted by each term's weightPercent.
// A term the student has no exam/mark for yet is simply excluded — the
// result reflects "graded so far", not a zero for ungraded work. This is
// what makes it safe to call the same computation right after Unit Test 1
// closes and again after Mid-Term closes: it just includes more terms
// each time, rather than needing a separate "term-only" code path.
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
