import { Exam } from "../models/exam.model.js";
import { GradingTerm } from "../models/grading-term.model.js";
import { Classroom } from "../models/classroom.model.js";
import { Subject } from "../models/subject.model.js";
import { AppError } from "../utils/AppError.js";
import { writeAudit } from "./audit.service.js";
import { getAssignedClassroomIds } from "./teacher-access.service.js";

export const listExams = async (query = {}, user = null) => {
  const filter = { isArchived: { $ne: true } };
  if (query.classroom) filter.classroom = query.classroom;
  if (query.academicYear) filter.academicYear = query.academicYear;
  if (query.subject) filter.subject = query.subject;
  if (query.gradingTerm) filter.gradingTerm = query.gradingTerm;
  if (query.from || query.to) {
    filter.examDate = {};
    if (query.from) filter.examDate.$gte = new Date(query.from);
    if (query.to) filter.examDate.$lte = new Date(query.to);
  }

  const assignedIds = await getAssignedClassroomIds(user);
  if (assignedIds !== null) {
    if (filter.classroom && !assignedIds.some((id) => String(id) === String(filter.classroom)))
      throw new AppError("You are not assigned to this classroom.", 403);
    filter.classroom = filter.classroom || { $in: assignedIds };
  }

  return Exam.find(filter)
    .populate("classroom", "className section")
    .populate("subject", "name code")
    .populate("gradingTerm", "name weightPercent")
    .sort({ examDate: 1 })
    .lean();
};

export const createExam = async (input, requestId) => {
  const { classroom, subject, gradingTerm, academicYear, name, examDate, maxMarks, passMarks } = input;
  if (!classroom || !subject || !gradingTerm || !academicYear || !name || !examDate || !maxMarks)
    throw new AppError(
      "classroom, subject, gradingTerm, academicYear, name, examDate, and maxMarks are required.",
      400,
    );

  const [room, subj, term] = await Promise.all([
    Classroom.findById(classroom),
    Subject.findById(subject),
    GradingTerm.findById(gradingTerm),
  ]);
  if (!room) throw new AppError("Classroom not found.", 404);
  if (!subj) throw new AppError("Subject not found.", 404);
  if (!term) throw new AppError("Grading term not found.", 404);
  if (String(term.academicYear) !== String(academicYear))
    throw new AppError("The grading term does not belong to this academic year.", 400);

  try {
    const exam = await Exam.create({
      classroom,
      subject,
      gradingTerm,
      academicYear,
      name: String(name).trim(),
      examDate: new Date(examDate),
      maxMarks: Number(maxMarks),
      passMarks: passMarks != null ? Number(passMarks) : null,
    });
    await writeAudit({
      entityType: "exam",
      entityId: exam._id,
      action: "CREATE",
      changes: { after: exam.toObject() },
      requestId,
    });
    return exam;
  } catch (e) {
    if (e?.code === 11000)
      throw new AppError("An exam for this classroom, subject, and grading term already exists.", 409);
    throw e;
  }
};

export const updateExam = async (id, input, requestId) => {
  const exam = await Exam.findById(id);
  if (!exam) throw new AppError("Exam not found.", 404);
  const before = exam.toObject();

  if (input.name) exam.name = String(input.name).trim();
  if (input.examDate) exam.examDate = new Date(input.examDate);
  if (input.maxMarks != null) exam.maxMarks = Number(input.maxMarks);
  if (input.passMarks !== undefined) exam.passMarks = input.passMarks != null ? Number(input.passMarks) : null;
  if (typeof input.isArchived === "boolean") exam.isArchived = input.isArchived;

  await exam.save();
  await writeAudit({
    entityType: "exam",
    entityId: exam._id,
    action: "UPDATE",
    changes: { before, after: exam.toObject() },
    requestId,
  });
  return exam;
};
