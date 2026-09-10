import { z } from "zod";
import { objectId } from "./common.schema.js";

const base = {
  academicYear: objectId,
  name: z.string().trim().min(1, "Grading term name is required.").max(60),
  weightPercent: z.coerce.number().min(0).max(100),
  order: z.coerce.number().optional(),
  isArchived: z.boolean().optional(),
};

export const createGradingTermSchema = z.object(base);
export const updateGradingTermSchema = z.object(base).partial();
