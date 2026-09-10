import { z } from "zod";
import { objectId } from "./common.schema.js";

const markRow = z.object({
  studentId: objectId,
  marksObtained: z.coerce.number().min(0).nullable().optional(),
  isAbsent: z.boolean().optional(),
  remarks: z.string().trim().max(300).optional(),
});

export const bulkEnterMarksSchema = z.object({
  entries: z.array(markRow).min(1, "At least one entry is required."),
});

export const subjectGradeQuerySchema = z.object({
  studentId: objectId,
  subjectId: objectId,
  academicYearId: objectId,
});
