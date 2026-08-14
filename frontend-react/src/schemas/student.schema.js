import { z } from "zod";

import { getTodayDateInputValue, isValidDateInput } from "../utils/date";

export const studentSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must contain at least 2 characters.")
    .max(100, "Name cannot exceed 100 characters."),

  rollNo: z
    .string()
    .trim()
    .min(1, "Roll number is required.")
    .refine(
      (value) => /^\d+$/.test(value),
      "Roll number must be a whole number.",
    )
    .transform(Number)
    .refine((value) => value > 0, "Roll number must be greater than 0."),

  class: z
    .string()
    .trim()
    .min(1, "Class is required.")
    .max(50, "Class cannot exceed 50 characters."),

  section: z
    .string()
    .trim()
    .min(1, "Section is required.")
    .max(20, "Section cannot exceed 20 characters."),

  status: z.enum(["active", "inactive", "graduated", "transferred", "suspended"]).default("active"),

  dob: z
    .string()
    .min(1, "Date of birth is required.")
    .refine(isValidDateInput, "Date of birth must be a valid date.")
    .refine(
      (value) => value <= getTodayDateInputValue(),
      "Date of birth must be today or earlier.",
    ),
});
