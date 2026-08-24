import mongoose from "mongoose";

const assignmentSubmissionSchema = new mongoose.Schema(
  {
    assignment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Assignment",
      required: true,
      index: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true,
    },
    file: {
      originalName: { type: String, required: true },
      storedPath: { type: String, required: true },
      mimeType: { type: String, default: null },
      sizeBytes: { type: Number, default: null },
    },
    submittedAt: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ["submitted", "late", "graded"],
      default: "submitted",
    },
    marksObtained: { type: Number, default: null, min: 0 },
    feedback: { type: String, trim: true, maxlength: 2000, default: "" },
    gradedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    gradedAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false },
);

// One submission per student per assignment — resubmitting replaces the
// existing record (see assignment.service.js) rather than creating a
// second row, so "submitted" always means "their current, latest work".
assignmentSubmissionSchema.index({ assignment: 1, student: 1 }, { unique: true });

export const AssignmentSubmission = mongoose.model(
  "AssignmentSubmission",
  assignmentSubmissionSchema,
);
