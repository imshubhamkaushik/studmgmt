import { z } from "zod";
import { objectId } from "./common.schema.js";

export const createEnrollmentSchema = z.object({
  studentId: objectId,
  academicYearId: objectId,
  classroomId: objectId,
  rollNo: z.coerce.number().int().min(1, "rollNo must be a positive integer."),
});

export const promoteStudentsSchema = z.object({
  studentIds: z.array(objectId).min(1, "At least one studentId is required."),
  fromAcademicYearId: objectId,
  toAcademicYearId: objectId,
  toClassroomId: objectId,
  // Keyed by studentId — left as a loose record since Zod can't know the
  // set of keys up front; enrollment.service.js still validates each
  // individual roll number against the classroom.
  rollNumbers: z.record(z.string(), z.coerce.number().int().min(1)).optional(),
});
