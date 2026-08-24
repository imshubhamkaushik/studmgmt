import mongoose from "mongoose";

const guardianSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      unique: true,
      index: true,
    },
    name: { type: String, trim: true, maxlength: 100, default: "" },
    passwordHash: { type: String, select: false, required: true },
    passwordSalt: { type: String, select: false, required: true },
    passwordChangedAt: { type: Date, default: null },
    isActive: { type: Boolean, default: true },
    portalFailedLoginAttempts: { type: Number, default: 0 },
    portalLockedUntil: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false },
);

export const Guardian = mongoose.model("Guardian", guardianSchema);
