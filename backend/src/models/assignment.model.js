import mongoose from "mongoose";

const assignmentSchema = new mongoose.Schema(
  {
    classroom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Classroom",
      required: true,
      index: true,
    },
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
    },
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 150 },
    description: { type: String, trim: true, maxlength: 4000, default: "" },
    dueDate: { type: Date, required: true },
    maxMarks: { type: Number, default: null, min: 1 },
    // Reference material the teacher attaches (instructions, a worksheet,
    // etc). Stored on local disk under backend/uploads/.
    attachment: {
      originalName: { type: String, default: null },
      storedPath: { type: String, default: null },
      mimeType: { type: String, default: null },
      sizeBytes: { type: Number, default: null },
      storageType: { type: String, enum: ["local"], default: "local" },
    },
    isArchived: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: false },
);

assignmentSchema.index({ classroom: 1, dueDate: 1 });

export const Assignment = mongoose.model("Assignment", assignmentSchema);
