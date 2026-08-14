import mongoose from "mongoose";
import { Enrollment } from "../models/enrollment.model.js";
import { Student } from "../models/student.model.js";
import { AcademicYear } from "../models/academic-year.model.js";
import { Classroom } from "../models/classroom.model.js";
import { AppError } from "../utils/AppError.js";
import { writeAudit } from "./audit.service.js";
import { applyTeacherEnrollmentScope } from "./teacher-access.service.js";

const ensureIds = (ids) => {
  if (!Array.isArray(ids) || !ids.length || ids.length > 200) throw new AppError("studentIds must contain between 1 and 200 IDs.", 400);
  if (new Set(ids).size !== ids.length) throw new AppError("studentIds contains duplicates.", 400);
  if (!ids.every((id) => mongoose.isValidObjectId(id))) throw new AppError("studentIds contains an invalid ID.", 400);
};

const loadPlacement = async (academicYearId, classroomId) => {
  const [year, classroom] = await Promise.all([
    AcademicYear.findOne({ _id: academicYearId, isArchived: { $ne: true } }),
    Classroom.findOne({ _id: classroomId, isActive: true }),
  ]);
  if (!year) throw new AppError("Academic year not found.", 404);
  if (!classroom) throw new AppError("Active classroom not found.", 404);
  if (!classroom.academicYear.equals(year._id)) throw new AppError("Classroom does not belong to the selected academic year.", 400);
  return { year, classroom };
};

const ensureCapacity = async (classroom, additional) => {
  if (!classroom.capacity) return;
  const current = await Enrollment.countDocuments({ classroom: classroom._id, status: "active" });
  if (current + additional > classroom.capacity) throw new AppError(`Classroom capacity would be exceeded (${current + additional}/${classroom.capacity}).`, 409);
};

export const listEnrollments = async (query = {}, user = null) => {
  const filter = {};
  for (const key of ["student", "academicYear", "classroom", "status"]) if (query[key]) filter[key] = query[key];
  const scopedFilter = await applyTeacherEnrollmentScope(user, filter);
  return Enrollment.find(scopedFilter).populate("student", "studentId name status class section").populate("academicYear", "name isActive").populate("classroom", "className section capacity").sort({ createdAt: -1 }).lean();
};

export const enrollStudent = async (data, requestId = null) => {
  const { studentId, academicYearId, classroomId, rollNo } = data;
  if (!mongoose.isValidObjectId(studentId) || !mongoose.isValidObjectId(academicYearId) || !mongoose.isValidObjectId(classroomId)) throw new AppError("Invalid enrollment ID.", 400);
  if (!Number.isInteger(Number(rollNo)) || Number(rollNo) < 1) throw new AppError("rollNo must be a positive integer.", 400);
  const [student, placement] = await Promise.all([
    Student.findOne({ _id: studentId, isDeleted: { $ne: true }, status: "active" }),
    loadPlacement(academicYearId, classroomId),
  ]);
  if (!student) throw new AppError("Active student not found.", 404);
  await ensureCapacity(placement.classroom, 1);
  const existing = await Enrollment.findOne({ student: studentId, academicYear: academicYearId });
  if (existing) throw new AppError("Student already has an enrollment for this academic year.", 409);
  const rollConflict = await Enrollment.findOne({ classroom: classroomId, rollNo: Number(rollNo), status: "active" });
  if (rollConflict) throw new AppError("Roll number is already assigned in this classroom.", 409);
  const enrollment = await Enrollment.create({ student: studentId, academicYear: academicYearId, classroom: classroomId, rollNo: Number(rollNo) });
  await writeAudit({ entityType: "enrollment", entityId: enrollment._id, action: "CREATE", changes: { after: enrollment.toObject() }, requestId });
  return enrollment;
};

export const promoteStudents = async ({ studentIds, fromAcademicYearId, toAcademicYearId, toClassroomId, rollNumbers = {} }, requestId = null) => {
  ensureIds(studentIds);
  if (![fromAcademicYearId, toAcademicYearId, toClassroomId].every(mongoose.isValidObjectId)) throw new AppError("Invalid promotion ID.", 400);
  if (String(fromAcademicYearId) === String(toAcademicYearId)) throw new AppError("Source and destination academic years must differ.", 400);
  const { classroom } = await loadPlacement(toAcademicYearId, toClassroomId);
  const source = await Enrollment.find({ student: { $in: studentIds }, academicYear: fromAcademicYearId, status: "active" });
  if (source.length !== studentIds.length) throw new AppError("Every student must have an active enrollment in the source academic year.", 400);
  const existing = await Enrollment.countDocuments({ student: { $in: studentIds }, academicYear: toAcademicYearId });
  if (existing) throw new AppError("At least one selected student is already enrolled in the destination academic year.", 409);
  await ensureCapacity(classroom, studentIds.length);
  const usedRolls = new Set((await Enrollment.find({ classroom: toClassroomId, status: "active" }).select("rollNo").lean()).map((e) => e.rollNo));
  const docs = source.map((s, index) => {
    const requested = Number(rollNumbers[String(s.student)] ?? rollNumbers[s.student.toString()] ?? (index + 1));
    if (!Number.isInteger(requested) || requested < 1 || usedRolls.has(requested)) throw new AppError("Destination roll numbers must be positive and unique.", 409);
    usedRolls.add(requested);
    return { student: s.student, academicYear: toAcademicYearId, classroom: toClassroomId, rollNo: requested };
  });
  // Prevalidation is completed before writes; bulkWrite keeps this deterministic on standalone MongoDB too.
  await Enrollment.updateMany({ _id: { $in: source.map((s) => s._id) } }, { status: "completed", endDate: new Date() });
  const created = await Enrollment.insertMany(docs);
  await Promise.all(created.map((e) => writeAudit({ entityType: "enrollment", entityId: e._id, action: "PROMOTE", changes: { fromAcademicYearId, toAcademicYearId, toClassroomId, rollNo: e.rollNo }, requestId })));
  return created;
};
