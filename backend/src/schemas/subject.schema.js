import { z } from "zod";

const base = {
  name: z.string().trim().min(1, "Subject name is required.").max(60),
  code: z.string().trim().max(15).optional(),
  isActive: z.boolean().optional(),
};

export const createSubjectSchema = z.object(base);
export const updateSubjectSchema = z.object(base).partial();
