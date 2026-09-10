import { z } from "zod";
import { objectId } from "./common.schema.js";

export const createAssignmentSchema = z.object({
  classroom: objectId,
  subject: objectId,
  title: z.string().trim().min(1, "title is required.").max(150),
  description: z.string().trim().max(4000).optional(),
  dueDate: z.coerce.date({ errorMap: () => ({ message: "A valid dueDate is required." }) }),
  maxMarks: z.coerce.number().min(1).nullable().optional(),
});

export const updateAssignmentSchema = z.object({
  title: z.string().trim().min(1).max(150).optional(),
  description: z.string().trim().max(4000).optional(),
  dueDate: z.coerce.date().optional(),
  maxMarks: z.coerce.number().min(1).nullable().optional(),
  isArchived: z.boolean().optional(),
});
