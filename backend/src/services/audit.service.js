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
