import mongoose from "mongoose";
import { Attendance } from "../models/attendance.model.js";
import { Student } from "../models/student.model.js";
import { AppError } from "../utils/AppError.js";
import { ATTENDANCE_STATUSES } from "../utils/attendance-statuses.js";
import { parseAttendanceDate } from "../validators/attendance.validator.js";
import { writeAudit } from "./audit.service.js";

const dateOnly = (date) => date.toISOString().slice(0, 10);

export const markBulkAttendance = async ({ className, section, date, records }, requestId = null) => {
  const ids = records.map((record) => record.studentId);
  const students = await Student.find({ _id: { $in: ids }, class: className, section, status: "active", isDeleted: { $ne: true } }).select("_id").lean();
  if (students.length !== ids.length) throw new AppError("All attendance records must belong to active, non-archived students in the selected class and section.", 400);
  const existing = await Attendance.find({ student: { $in: ids }, date }).lean();
  const existingIds = new Set(existing.map((item) => String(item.student)));
  const operations = records.map((record) => ({
    updateOne: { filter: { student: record.studentId, date }, update: { $set: { status: record.status, markedAt: new Date() }, $setOnInsert: { student: record.studentId, date } }, upsert: true },
  }));
  const result = await Attendance.bulkWrite(operations, { ordered: true });
  await writeAudit({ entityType: "attendance", entityId: `${className}-${section}-${dateOnly(date)}`, action: "BULK_MARK", changes: { class: className, section, date: dateOnly(date), inserted: result.upsertedCount, updated: result.modifiedCount, existing: existingIds.size }, requestId });
  return { date: dateOnly(date), class: className, section, matched: result.matchedCount, created: result.upsertedCount, updated: result.modifiedCount, total: records.length };
};

export const getAttendance = async (query = {}) => {
  const filter = {};
  if (query.date) filter.date = parseAttendanceDate(query.date);
  if (query.status) {
    const status = String(query.status).toLowerCase();
    if (!ATTENDANCE_STATUSES.includes(status)) throw new AppError("Invalid attendance status.", 400);
    filter.status = status;
  }
  if (query.studentId) {
    if (!mongoose.isValidObjectId(query.studentId)) throw new AppError("Invalid studentId.", 400);
    filter.student = query.studentId;
  }
  const rows = await Attendance.find(filter).sort({ date: -1, _id: -1 }).populate("student", "studentId name rollNo class section status isDeleted").lean();
  return rows.filter((row) => row.student && row.student.isDeleted !== true && (!query.class || row.student.class === query.class) && (!query.section || row.student.section === query.section));
};

export const getAttendanceSummary = async (query = {}) => {
  const filter = {};
  if (query.from) filter.date = { ...(filter.date || {}), $gte: parseAttendanceDate(query.from) };
  if (query.to) filter.date = { ...(filter.date || {}), $lte: parseAttendanceDate(query.to) };
  const rows = await Attendance.find(filter).populate("student", "class section isDeleted").lean();
  const filtered = rows.filter((row) => row.student && row.student.isDeleted !== true && (!query.class || row.student.class === query.class) && (!query.section || row.student.section === query.section));
  const counts = Object.fromEntries(ATTENDANCE_STATUSES.map((status) => [status, 0]));
  filtered.forEach((row) => { counts[row.status] += 1; });
  const total = filtered.length;
  const attended = counts.present + counts.late + counts.excused;
  return { total, ...counts, attendancePercentage: total ? Number(((attended / total) * 100).toFixed(2)) : 0 };
};

export const getStudentAttendanceHistory = async (studentId, query = {}) => {
  if (!mongoose.isValidObjectId(studentId)) throw new AppError("Invalid student ID.", 400);
  const student = await Student.findOne({ _id: studentId, isDeleted: { $ne: true } }).lean();
  if (!student) throw new AppError("Student not found.", 404);
  const filter = { student: studentId };
  if (query.from) filter.date = { ...(filter.date || {}), $gte: parseAttendanceDate(query.from) };
  if (query.to) filter.date = { ...(filter.date || {}), $lte: parseAttendanceDate(query.to) };
  const records = await Attendance.find(filter).sort({ date: -1 }).lean();
  const counts = Object.fromEntries(ATTENDANCE_STATUSES.map((status) => [status, 0]));
  records.forEach((record) => { counts[record.status] += 1; });
  const total = records.length;
  const attended = counts.present + counts.late + counts.excused;
  return { student: { _id: student._id, studentId: student.studentId, name: student.name }, records, summary: { total, ...counts, attendancePercentage: total ? Number(((attended / total) * 100).toFixed(2)) : 0 } };
};
