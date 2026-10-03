import mongoose from "mongoose";

// Tracks one background ("Bulk Import") student CSV import. The job document
// is the single source of truth for progress; the rows themselves are
// processed in-process by services/import-job.service.js.
const importErrorSchema = new mongoose.Schema(
  {
    rowNumber: { type: Number, required: true },
    name: { type: String, default: "" },
    class: { type: String, default: "" },
    section: { type: String, default: "" },
    rollNo: { type: String, default: "" },
    dob: { type: String, default: "" },
    stage: { type: String, enum: ["validation", "import"], required: true },
    message: { type: String, required: true },
  },
  { _id: false },
);

const importJobSchema = new mongoose.Schema(
  {
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    originalName: { type: String, default: null },
    status: { type: String, enum: ["processing", "completed", "failed"], default: "processing" },
    totalRows: { type: Number, default: null },
    // Rows that passed validation and were queued for creation.
    queuedCount: { type: Number, default: null },
    processedCount: { type: Number, default: 0 },
    successCount: { type: Number, default: 0 },
    failureCount: { type: Number, default: 0 },
    // Rows rejected by validation before being queued.
    errorCount: { type: Number, default: 0 },
    errorMessage: { type: String, default: null },
    rowErrors: { type: [importErrorSchema], default: [] },
    completedAt: { type: Date, default: null },
    finishedAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false },
);

export const ImportJob = mongoose.model("ImportJob", importJobSchema);
