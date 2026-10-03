import { AuditLog } from "../models/audit-log.model.js";
import { getRequestActor } from "../utils/request-store.js";

export const writeAudit = async ({
  entityType,
  entityId,
  action,
  changes = null,
  requestId = null,
  actor = null,
  actorEmail = null,
}) => {
  try {
    const requestActor = getRequestActor();
    const resolvedActor = actor || requestActor?.sub || null;
    const resolvedEmail = actorEmail || requestActor?.email || null;
    await AuditLog.create({
      entityType,
      entityId,
      action,
      changes,
      requestId,
      actor: resolvedActor,
      actorEmail: resolvedEmail,
    });
  } catch (error) {
    console.error(
      JSON.stringify({
        level: "error",
        event: "audit_write_failed",
        message: error.message,
        requestId,
      }),
    );
  }
};

export const getEntityAudit = (entityType, entityId) =>
  AuditLog.find({ entityType, entityId })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

// Powers the dashboard "Recent Activity" feed: the most recent audit
// entries across every entity type, not scoped to a single record.
export const getRecentActivity = (limit = 15) =>
  AuditLog.find()
    .sort({ createdAt: -1 })
    .limit(Math.min(Number(limit) || 15, 50))
    .lean();

// Powers the admin-only audit dashboard — unlike getRecentActivity (fixed
// small limit, no filters, used for a glanceable widget), this supports
// filtering and pagination over the full log, since "who did what, when"
// across the whole system is the actual point of an audit dashboard, not
// just the last dozen events.
export const listAuditLog = async (filters = {}) => {
  const query = {};
  if (filters.entityType) query.entityType = filters.entityType;
  if (filters.action) query.action = filters.action;
  if (filters.actorEmail) query.actorEmail = filters.actorEmail;
  if (filters.dateFrom || filters.dateTo) {
    query.createdAt = {};
    if (filters.dateFrom) query.createdAt.$gte = new Date(filters.dateFrom);
    if (filters.dateTo) query.createdAt.$lte = new Date(filters.dateTo);
  }

  const page = Math.max(Number(filters.page) || 1, 1);
  const limit = Math.min(Math.max(Number(filters.limit) || 25, 1), 100);

  const [items, total] = await Promise.all([
    AuditLog.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    AuditLog.countDocuments(query),
  ]);

  return { items, total, page, limit, totalPages: Math.max(Math.ceil(total / limit), 1) };
};

// Distinct entityType/action/actorEmail values currently in the log —
// used to populate the dashboard's filter dropdowns with only options
// that would actually return results, rather than a hardcoded list that
// drifts from what writeAudit callers actually pass.
export const getAuditFilterOptions = async () => {
  const [entityTypes, actions, actorEmails] = await Promise.all([
    AuditLog.distinct("entityType"),
    AuditLog.distinct("action"),
    AuditLog.distinct("actorEmail", { actorEmail: { $ne: null } }),
  ]);
  return { entityTypes: entityTypes.sort(), actions: actions.sort(), actorEmails: actorEmails.sort() };
};
