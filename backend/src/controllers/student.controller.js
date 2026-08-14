import * as studentService from "../services/student.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const createStudent = asyncHandler(async (req, res) => {
  const student = await studentService.createStudent(req.body, req.requestId);

  res.status(201).json({
    success: true,
    message: "Student created successfully.",
    data: student,
  });
});

export const getStudents = asyncHandler(async (req, res) => {
  const result = await studentService.getStudents(req.query);

  res.status(200).json({
    success: true,
    data: result.students,
    pagination: result.pagination,
  });
});

export const getStudentById = asyncHandler(async (req, res) => {
  const student = await studentService.getStudentById(req.params.id);

  res.status(200).json({
    success: true,
    data: student,
  });
});

export const updateStudent = asyncHandler(async (req, res) => {
  const student = await studentService.updateStudentById(
    req.params.id,
    req.body,
    req.requestId,
  );

  res.status(200).json({
    success: true,
    message: "Student updated successfully.",
    data: student,
  });
});

export const deleteStudent = asyncHandler(async (req, res) => {
  await studentService.deleteStudentById(req.params.id, req.requestId);

  res.status(200).json({
    success: true,
    message: "Student archived successfully.",
  });
});

export const getStudentFilterOptions = asyncHandler(async (req, res) => {
  const options = await studentService.getStudentFilterOptions();
  res.status(200).json({ success: true, data: options });
});

const escapeCsv = (value) => {
  const text = value instanceof Date ? value.toISOString().slice(0, 10) : String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export const exportStudents = asyncHandler(async (req, res) => {
  const students = await studentService.getStudentsForExport(req.query);
  const headers = ["Student ID", "Name", "Class", "Section", "Roll No", "Status", "Date of Birth", "Created At"];
  const lines = students.map((student) => [student.studentId, student.name, student.class, student.section, student.rollNo, student.status, student.dob, student.createdAt].map(escapeCsv).join(","));
  const csv = [headers.join(","), ...lines].join("\r\n");
  const fileName = `students-${new Date().toISOString().slice(0, 10)}.csv`;
  res.status(200).set({ "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${fileName}"` }).send(csv);
});

export const importStudents = asyncHandler(async (req, res) => {
  const students = await studentService.importStudents(req.body?.students);
  res.status(201).json({ success: true, message: `${students.length} student(s) imported successfully.`, data: students });
});

export const restoreStudent = asyncHandler(async (req, res) => {
  const student = await studentService.restoreStudentById(req.params.id, req.requestId);
  res.status(200).json({ success: true, message: "Student restored successfully.", data: student });
});

export const bulkUpdateStudents = asyncHandler(async (req, res) => {
  const result = await studentService.bulkUpdateStudents(req.body, req.requestId);
  res.status(200).json({ success: true, message: `${result.modified} student(s) updated.`, data: result });
});

export const getStudentAuditHistory = asyncHandler(async (req, res) => {
  const data = await studentService.getStudentAuditHistory(req.params.id);
  res.status(200).json({ success: true, data });
});
