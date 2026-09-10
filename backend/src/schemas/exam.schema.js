import { z } from "zod";
import { objectId } from "./common.schema.js";

const base = {
  academicYear: objectId,
  classroom: objectId,
  subject: objectId,
  gradingTerm: objectId,
  name: z.string().trim().min(1, "Exam name is required.").max(100),
  examDate: z.coerce.date({ errorMap: () => ({ message: "A valid examDate is required." }) }),
  maxMarks: z.coerce.number().min(1, "maxMarks must be at least 1."),
  passMarks: z.coerce.number().min(0).nullable().optional(),
};

export const createExamSchema = z.object(base);
export const updateExamSchema = z.object(base).partial();
