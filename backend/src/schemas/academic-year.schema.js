import { z } from "zod";

// Mirrors the shape already enforced inline in academic-year.service.js's
// `dates()` helper — this just moves the "is the shape even right" part of
// that check to the route boundary. The cross-field endDate > startDate
// rule and the isActive-toggle side effect stay in the service, since the
// latter needs a database round trip Zod isn't meant to do.
const base = {
  name: z.string().trim().min(1, "Academic year name is required.").max(30),
  startDate: z.coerce.date({ errorMap: () => ({ message: "Valid startDate is required." }) }),
  endDate: z.coerce.date({ errorMap: () => ({ message: "Valid endDate is required." }) }),
  isActive: z.boolean().optional(),
};

export const createAcademicYearSchema = z.object(base);
export const updateAcademicYearSchema = z.object(base).partial();
