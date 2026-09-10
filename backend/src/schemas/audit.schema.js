import { z } from "zod";

export const auditLogQuerySchema = z.object({
  entityType: z.string().trim().min(1).optional(),
  action: z.string().trim().min(1).optional(),
  actorEmail: z.string().trim().min(1).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});
