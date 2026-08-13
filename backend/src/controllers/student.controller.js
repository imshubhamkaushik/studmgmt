import * as studentService from "../services/student.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const createStudent = asyncHandler(async (req, res) => {
  const student = await studentService.createStudent(req.body);

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
  );

  res.status(200).json({
    success: true,
    message: "Student updated successfully.",
    data: student,
  });
});

export const deleteStudent = asyncHandler(async (req, res) => {
  await studentService.deleteStudentById(req.params.id);

  res.status(200).json({
    success: true,
    message: "Student deleted successfully.",
  });
});
