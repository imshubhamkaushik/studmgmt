import { z } from "zod";
import { objectId } from "./common.schema.js";

const base = {
  className: z.string().trim().min(1, "className is required.").max(50),
  section: z.string().trim().min(1, "section is required.").max(20),
  academicYear: objectId,
  capacity: z.coerce.number().int().min(1).max(10000).nullable().optional(),
  isActive: z.boolean().optional(),
};

export const createClassroomSchema = z.object(base);
export const updateClassroomSchema = z.object(base).partial();
export const generateDefaultClassroomsSchema = z.object({
  academicYear: objectId,
});
