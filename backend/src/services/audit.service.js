import { AuditLog } from "../models/audit-log.model.js";

export const writeAudit = async ({ entityType, entityId, action, changes = null, requestId = null }) => {
  try {
    await AuditLog.create({ entityType, entityId, action, changes, requestId });
  } catch (error) {
    console.error(JSON.stringify({ level: "error", event: "audit_write_failed", message: error.message, requestId }));
  }
};

export const getEntityAudit = (entityType, entityId) =>
  AuditLog.find({ entityType, entityId }).sort({ createdAt: -1 }).limit(100).lean();
