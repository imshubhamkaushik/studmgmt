import { Student } from "../models/student.model.js";
import { AppError } from "../utils/AppError.js";
import {generateStudentId } from "./student-id.service.js";

const SORTABLE_FIELDS = new Set([
  "studentId",
  "name",
  "rollNo",
  "class",
  "section",
  "dob",
  "createdAt",
  "updatedAt",
]);

const parsePositiveInteger = (
  value,
  defaultValue,
  fieldName,
  maxValue = Number.MAX_SAFE_INTEGER,
) => {
  if (value === undefined) {
    return defaultValue;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1 || parsed > maxValue) {
    throw new AppError(
      `${fieldName} must be an integer between 1 and ${maxValue}.`,
      400,
    );
  }

  return parsed;
};

export const createStudent = async (studentData) => {
  const studentId = await generateStudentId();

  return Student.create({
    ...studentData,
    studentId,
  });
};

export const getStudents = async (query) => {
  const page = parsePositiveInteger(query.page, 1, "page", 100000);

  const limit = parsePositiveInteger(query.limit, 10, "limit", 100);

  const skip = (page - 1) * limit;

  const search = typeof query.search === "string" ? query.search.trim() : "";

  const sortBy = typeof query.sortBy === "string" ? query.sortBy : "createdAt";

  const sortOrder =
    typeof query.sortOrder === "string"
      ? query.sortOrder.toLowerCase()
      : "desc";

  if (!SORTABLE_FIELDS.has(sortBy)) {
    throw new AppError(
      `sortBy must be one of: ${[...SORTABLE_FIELDS].join(", ")}.`,
      400,
    );
  }

  if (!["asc", "desc"].includes(sortOrder)) {
    throw new AppError("sortOrder must be either asc or desc.", 400);
  }

  if (search.length > 100) {
    throw new AppError("search cannot exceed 100 characters.", 400);
  }

  const filter = {};

  if (search) {
    const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    filter.$or = [
      {
        name: {
          $regex: escapedSearch,
          $options: "i",
        },
      },
      {
        class: {
          $regex: escapedSearch,
          $options: "i",
        },
      },
      {
        section: {
          $regex: escapedSearch,
          $options: "i",
        },
      },
      {
        studentId: {
          $regex: escapedSearch,
          $options: "i",
        },
      },
    ];
  }

  const sortDirection = sortOrder === "asc" ? 1 : -1;
  const sort = { [sortBy]: sortDirection, _id: sortDirection };

  const [students, totalItems] = await Promise.all([
    Student.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),

    Student.countDocuments(filter),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalItems / limit));

  return {
    students,
    pagination: {
      page,
      limit,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
};

export const getStudentById = async (studentId) => {
  const student = await Student.findById(studentId).lean();

  if (!student) {
    throw new AppError("Student not found.", 404);
  }

  return student;
};

export const updateStudentById = async (studentId, studentData) => {
  const student = await Student.findByIdAndUpdate(studentId, studentData, {
    new: true,
    runValidators: true,
  }).lean();

  if (!student) {
    throw new AppError("Student not found.", 404);
  }

  return student;
};

export const deleteStudentById = async (studentId) => {
  const student = await Student.findByIdAndDelete(studentId);

  if (!student) {
    throw new AppError("Student not found.", 404);
  }
};
