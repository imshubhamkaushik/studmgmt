import mongoose from "mongoose";

const portalSessionSchema = new mongoose.Schema(
  {
    // "actorType" + "actorId" rather than a single ref, since a portal
    // session belongs to either a Student or a Guardian document — two
    // different collections, not one polymorphic one.
    actorType: { type: String, enum: ["student", "guardian"], required: true },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
    replacedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PortalSession",
      default: null,
    },
    userAgent: { type: String, default: null },
    ip: { type: String, default: null },
  },
  { timestamps: true, versionKey: false },
);

portalSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
portalSessionSchema.index({ actorType: 1, actorId: 1 });

export const PortalSession = mongoose.model("PortalSession", portalSessionSchema);
