import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    entityType: { type: String, required: true, index: true },
    
    entityId: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      index: true,
    },
    
    action: { type: String, required: true, index: true },
    
    changes: { type: mongoose.Schema.Types.Mixed, default: null },
    
    requestId: { type: String, default: null, index: true },
    
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    
    actorEmail: { type: String, default: null },
  },
  { timestamps: true },
);

auditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });

export const AuditLog = mongoose.model("AuditLog", auditLogSchema);
