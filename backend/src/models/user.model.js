import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      index: true,
    },
    passwordHash: { type: String, required: true, select: false },
    passwordSalt: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ["admin", "staff", "teacher"],
      default: "staff",
      index: true,
    },
    isActive: { type: Boolean, default: true, index: true },
    // Lets an admin grant a teacher every permission a staff account has,
    // without changing their role — the teacher keeps their teacher-only
    // access (attendance, teacher-scoped promotion) *plus* staff access,
    // rather than losing one for the other. Only meaningful for teachers;
    // ignored for admin/staff accounts.
    hasStaffPrivileges: { type: Boolean, default: false },
    lastLoginAt: { type: Date, default: null },
    failedLoginAttempts: { type: Number, default: 0 },
    lockedUntil: { type: Date, default: null },
  },
  { timestamps: true },
);

export const User = mongoose.model("User", userSchema);
