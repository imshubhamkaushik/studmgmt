import { Student } from "../models/student.model.js";
import { STUDENT_STATUSES } from "../utils/student-statuses.js";
import { AppError } from "../utils/AppError.js";
import { generateStudentId } from "./student-id.service.js";
import { normalizeAndValidateStudentPayload } from "../validators/student.validator.js";
import { writeAudit, getEntityAudit } from "./audit.service.js";
import { applyTeacherStudentScope, assertTeacherStudentAccess } from "./teacher-access.service.js";

const SORTABLE_FIELDS = new Set(["studentId", "name", "rollNo", "class", "section", "status", "dob", "createdAt", "updatedAt"]);
const MAX_PAGE = 100000;
const MAX_LIMIT = 100;
const MAX_SEARCH_LENGTH = 100;

const parsePositiveInteger = (value, defaultValue, fieldName, maxValue) => {
  if (value === undefined) return defaultValue;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > maxValue) {
    throw new AppError(`${fieldName} must be an integer between 1 and ${maxValue}.`, 400);
  }
  return parsed;
};

const parseFilterText = (value, fieldName, maxLength) => {
  if (value === undefined || value === "") return undefined;
  if (typeof value !== "string") throw new AppError(`${fieldName} must be a string.`, 400);
  const normalized = value.trim();
  if (normalized.length > maxLength) throw new AppError(`${fieldName} cannot exceed ${maxLength} characters.`, 400);
  return normalized || undefined;
};

const buildStudentFilter = (query = {}) => {
  const search = parseFilterText(query.search, "search", MAX_SEARCH_LENGTH);
  const className = parseFilterText(query.class, "class", 50);
  const section = parseFilterText(query.section, "section", 20);
  const status = parseFilterText(query.status, "status", 20)?.toLowerCase();
  if (status && !STUDENT_STATUSES.includes(status)) {
    throw new AppError(`status must be one of: ${STUDENT_STATUSES.join(", ")}.`, 400);
  }
  const includeDeleted = query.includeDeleted === "true";
  const filter = includeDeleted ? {} : { isDeleted: { $ne: true } };
  if (className) filter.class = className;
  if (section) filter.section = section;
  if (status) filter.status = status;
  if (search) {
    const numericRollNo = /^\d+$/.test(search) ? Number(search) : null;
    const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = ["name", "class", "section", "studentId", "admissionNo"].map((field) => ({ [field]: { $regex: escapedSearch, $options: "i" } }));
    if (numericRollNo !== null) filter.$or.push({ rollNo: numericRollNo });
  }
  return filter;
};

export const createStudent = async (studentData, requestId = null) => {
  const studentId = await generateStudentId();
  const student = await Student.create({ ...studentData, studentId });
  await writeAudit({ entityType: "student", entityId: student._id, action: "CREATE", changes: { after: student.toObject() }, requestId });
  return student;
};

export const getStudents = async (query, user = null) => {
  const page = parsePositiveInteger(query.page, 1, "page", MAX_PAGE);
  const limit = parsePositiveInteger(query.limit, 10, "limit", MAX_LIMIT);
  const sortBy = typeof query.sortBy === "string" ? query.sortBy : "createdAt";
  const sortOrder = typeof query.sortOrder === "string" ? query.sortOrder.toLowerCase() : "desc";
  if (!SORTABLE_FIELDS.has(sortBy)) throw new AppError(`sortBy must be one of: ${[...SORTABLE_FIELDS].join(", ")}.`, 400);
  if (!['asc', 'desc'].includes(sortOrder)) throw new AppError("sortOrder must be either asc or desc.", 400);
  const filter = await applyTeacherStudentScope(user, buildStudentFilter(query));
  const sortDirection = sortOrder === "asc" ? 1 : -1;
  const [students, totalItems] = await Promise.all([
    Student.find(filter).sort({ [sortBy]: sortDirection, _id: sortDirection }).skip((page - 1) * limit).limit(limit).lean(),
    Student.countDocuments(filter),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));
  return { students, pagination: { page, limit, totalItems, totalPages, hasNextPage: page < totalPages, hasPreviousPage: page > 1 } };
};

export const getStudentFilterOptions = async () => {
  const [classes, sections] = await Promise.all([Student.distinct("class"), Student.distinct("section")]);
  return { classes: classes.sort((a, b) => a.localeCompare(b, undefined, { numeric: true })), sections: sections.sort((a, b) => a.localeCompare(b, undefined, { numeric: true })), statuses: STUDENT_STATUSES };
};

export const getStudentsForExport = async (query, user = null) => Student.find(await applyTeacherStudentScope(user, buildStudentFilter(query))).sort({ class: 1, section: 1, rollNo: 1, _id: 1 }).lean();

export const importStudents = async (rows) => {
  if (!Array.isArray(rows) || rows.length === 0) throw new AppError("At least one student row is required.", 400);
  if (rows.length > 500) throw new AppError("A maximum of 500 students can be imported at once.", 400);
  const students = rows.map((row, index) => {
    try { return normalizeAndValidateStudentPayload(row); }
    catch (error) { throw new AppError(`Row ${index + 2}: ${error.message}`, 400); }
  });
  const seen = new Set();
  for (const student of students) {
    const key = `${student.class}\u0000${student.section}\u0000${student.rollNo}`;
    if (seen.has(key)) throw new AppError(`Duplicate Class ${student.class}, Section ${student.section}, Roll No ${student.rollNo} exists in the import file.`, 409);
    seen.add(key);
  }
  const existing = await Student.find({ $or: students.map(({ class: className, section, rollNo }) => ({ class: className, section, rollNo })) }).select("class section rollNo").lean();
  if (existing.length) {
    const first = existing[0];
    throw new AppError(`Roll number ${first.rollNo} already exists in Class ${first.class}, Section ${first.section}.`, 409);
  }
  const created = [];
  for (const student of students) created.push(await createStudent(student));
  return created;
};

export const getStudentById = async (studentId, user = null) => {
  await assertTeacherStudentAccess(user, studentId);
  const student = await Student.findOne({ _id: studentId, isDeleted: { $ne: true } }).lean();
  if (!student) throw new AppError("Student not found.", 404);
  return student;
};

export const updateStudentById = async (studentId, studentData, requestId = null) => {
  const existing = await Student.findOne({ _id: studentId, isDeleted: { $ne: true } });
  if (!existing) throw new AppError("Student not found.", 404);
  if (studentData.expectedUpdatedAt && new Date(studentData.expectedUpdatedAt).getTime() !== new Date(existing.updatedAt).getTime()) throw new AppError("This student was updated by someone else. Refresh and try again.", 409);
  const before = existing.toObject();
  delete studentData.expectedUpdatedAt;
  Object.assign(existing, studentData);
  await existing.save();
  const student = existing.toObject();
  await writeAudit({ entityType: "student", entityId: existing._id, action: "UPDATE", changes: { before, after: student }, requestId });
  return student;
};

export const deleteStudentById = async (studentId, requestId = null) => {
  const student = await Student.findOneAndUpdate({ _id: studentId, isDeleted: { $ne: true } }, { isDeleted: true, deletedAt: new Date(), status: "inactive" }, { new: true }).lean();
  if (!student) throw new AppError("Student not found.", 404);
  await writeAudit({ entityType: "student", entityId: student._id, action: "ARCHIVE", changes: { after: student }, requestId });
  return student;
};

export const restoreStudentById = async (studentId, requestId = null) => {
  const student = await Student.findOneAndUpdate({ _id: studentId, isDeleted: true }, { isDeleted: false, deletedAt: null, status: "active" }, { new: true }).lean();
  if (!student) throw new AppError("Archived student not found.", 404);
  await writeAudit({ entityType: "student", entityId: student._id, action: "RESTORE", changes: { after: student }, requestId });
  return student;
};

export const bulkUpdateStudents = async ({ ids, status }, requestId = null) => {
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > 200) throw new AppError("ids must contain between 1 and 200 student IDs.", 400);
  if (!STUDENT_STATUSES.includes(status)) throw new AppError("Invalid student status.", 400);
  const result = await Student.updateMany({ _id: { $in: ids }, isDeleted: { $ne: true } }, { status });
  await Promise.all(ids.map((entityId) => writeAudit({ entityType: "student", entityId, action: "BULK_STATUS_CHANGE", changes: { status }, requestId })));
  return { matched: result.matchedCount, modified: result.modifiedCount };
};

export const getStudentAuditHistory = async (studentId, user = null) => { await assertTeacherStudentAccess(user, studentId); return getEntityAudit("student", studentId); };

export const checkStudentAvailability = async ({ class: className, section, rollNo, excludeId } = {}) => {
  const normalizedClass = parseFilterText(className, "class", 50);
  const normalizedSection = parseFilterText(section, "section", 20);
  const parsedRollNo = Number(rollNo);
  if (!normalizedClass || !normalizedSection || !Number.isInteger(parsedRollNo) || parsedRollNo < 1) {
    throw new AppError("class, section and a positive integer rollNo are required.", 400);
  }
  const filter = { class: normalizedClass, section: normalizedSection, rollNo: parsedRollNo, isDeleted: { $ne: true } };
  if (excludeId) filter._id = { $ne: excludeId };
  const existing = await Student.exists(filter);
  return { available: !existing, class: normalizedClass, section: normalizedSection, rollNo: parsedRollNo };
};
