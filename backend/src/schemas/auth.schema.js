import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().min(1, "Email and password are required."),
  password: z.string().min(1, "Email and password are required."),
});

export const createUserSchema = z.object({
  name: z.string().trim().min(1, "Name, email, password and role are required."),
  email: z.string().trim().min(1, "Name, email, password and role are required."),
  password: z.string().min(12, "Password must be at least 12 characters."),
  role: z.enum(["admin", "staff", "teacher"], {
    errorMap: () => ({ message: "Invalid role." }),
  }),
});

export const updateUserSchema = z.object({
  name: z.string().trim().min(1).optional(),
  role: z.enum(["admin", "staff", "teacher"]).optional(),
  isActive: z.boolean().optional(),
  hasStaffPrivileges: z.boolean().optional(),
  unlock: z.boolean().optional(),
  password: z.string().min(12, "Password must be at least 12 characters.").optional(),
});
