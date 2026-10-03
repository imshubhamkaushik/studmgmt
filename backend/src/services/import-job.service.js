import { ImportJob } from "../models/import-job.model.js";
import { createStudent } from "./student.service.js";
import { normalizeAndValidateStudentPayload } from "../validators/student.validator.js";
import { parseCsv, escapeCsv } from "../utils/csv.js";
import { AppError } from "../utils/AppError.js";

export const MAX_IMPORT_ROWS = 5000;

const REQUIRED_COLUMNS = ["name", "class", "section", "rollno", "dob"];

const normalizeHeader = (value) => String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");

// Header aliases accepted in addition to the canonical names.
const HEADER_ALIASES = { dateofbirth: "dob", roll: "rollno", rollnumber: "rollno" };

// Exported for testing. Turns raw CSV text into row records keyed by the
// canonical column names, throwing a 400 AppError if the file is unusable.
export function parseStudentCsv(text) {
  const table = parseCsv(text);
  if (table.length < 2) throw new AppError("CSV must contain a header and at least one student.", 400);

  const headers = table[0].map((h) => {
    const normalized = normalizeHeader(h);
    return HEADER_ALIASES[normalized] || normalized;
  });
  if (!REQUIRED_COLUMNS.every((column) => headers.includes(column)))
    throw new AppError("CSV must include Name, Class, Section, Roll No and Date of Birth columns.", 400);

  return table.slice(1).map((values, index) => {
    const record = Object.fromEntries(headers.map((header, i) => [header, values[i] ?? ""]));
    return {
      rowNumber: index + 2, // +2: header is row 1, data starts on row 2
      raw: {
        name: record.name,
        class: record.class,
        section: record.section,
        rollNo: record.rollno,
        dob: record.dob,
        status: record.status || "active",
      },
    };
  });
}

// Exported for testing. Splits parsed rows into valid students ready to be
// created and per-row validation errors (including duplicates inside the
// file itself, which would otherwise only surface later as DB conflicts).
export function validateStudentRows(rows) {
  const valid = [];
  const errors = [];
  const seen = new Set();

  for (const { rowNumber, raw } of rows) {
    const failure = (message) => errors.push({ rowNumber, ...pickDisplay(raw), stage: "validation", message });
    try {
      const student = normalizeAndValidateStudentPayload(raw);
      const key = `${student.class}\u0000${student.section}\u0000${student.rollNo}`;
      if (seen.has(key)) {
        failure(`Duplicate Class ${student.class}, Section ${student.section}, Roll No ${student.rollNo} in this file.`);
        continue;
      }
      seen.add(key);
      valid.push({ rowNumber, raw, student });
    } catch (error) {
      failure(error.message);
    }
  }

  return { valid, errors };
}

const pickDisplay = (raw) => ({
  name: String(raw.name ?? ""),
  class: String(raw.class ?? ""),
  section: String(raw.section ?? ""),
  rollNo: String(raw.rollNo ?? ""),
  dob: String(raw.dob ?? ""),
});

// Creates the job record from an uploaded CSV, validates every row up front,
// then kicks off creation of the valid rows in the background and returns
// immediately so the HTTP request isn't held open for a large file.
export async function startImportJob({ buffer, originalName }, actor, requestId = null) {
  const rows = parseStudentCsv(buffer.toString("utf8"));
  if (rows.length > MAX_IMPORT_ROWS)
    throw new AppError(`A maximum of ${MAX_IMPORT_ROWS} students can be imported at once.`, 400);

  const { valid, errors } = validateStudentRows(rows);

  const job = await ImportJob.create({
    createdBy: actor.sub,
    originalName: originalName || null,
    status: "processing",
    totalRows: rows.length,
    queuedCount: valid.length,
    errorCount: errors.length,
    rowErrors: errors,
  });

  if (valid.length === 0) {
    job.status = "completed";
    job.finishedAt = new Date();
    job.completedAt = job.finishedAt;
    await job.save();
  } else {
    // Detached on purpose. AsyncLocalStorage carries the request's actor into
    // this work, so audit entries still record who started the import.
    setImmediate(() => {
      processImportJob(job._id, valid, requestId).catch((error) => {
        console.error(JSON.stringify({ level: "error", event: "import_job_crashed", jobId: String(job._id), message: error.message }));
      });
    });
  }

  return { jobId: job._id, totalRows: rows.length, queuedCount: valid.length, errorCount: errors.length };
}

// Exported for testing: createStudentFn and the job model are injectable.
export async function processImportJob(jobId, validRows, requestId = null, { createStudentFn = createStudent, Model = ImportJob } = {}) {
  try {
    for (const { rowNumber, raw, student } of validRows) {
      try {
        await createStudentFn(student, requestId);
        await Model.updateOne({ _id: jobId }, { $inc: { processedCount: 1, successCount: 1 } });
      } catch (error) {
        // A duplicate roll number or similar business-rule conflict won't
        // succeed on retry, so it's recorded as a failure for this row.
        await Model.updateOne(
          { _id: jobId },
          {
            $inc: { processedCount: 1, failureCount: 1 },
            $push: { rowErrors: { rowNumber, ...pickDisplay(raw), stage: "import", message: error.message } },
          },
        );
      }
    }
    const now = new Date();
    await Model.updateOne({ _id: jobId }, { $set: { status: "completed", finishedAt: now, completedAt: now } });
  } catch (error) {
    await Model.updateOne(
      { _id: jobId },
      { $set: { status: "failed", errorMessage: error.message, finishedAt: new Date() } },
    ).catch(() => {});
    throw error;
  }
}

// If the server stopped while a job was running, nothing will ever finish it
// — mark such jobs failed on startup so the UI doesn't poll forever.
export async function failInterruptedImportJobs() {
  const result = await ImportJob.updateMany(
    { status: "processing" },
    { $set: { status: "failed", errorMessage: "The server restarted before this import finished.", finishedAt: new Date() } },
  );
  return result.modifiedCount ?? 0;
}

async function loadJobForActor(jobId, actor) {
  const job = await ImportJob.findById(jobId).lean();
  if (!job) throw new AppError("Import job not found.", 404);

  const canView = actor.role === "admin" || String(job.createdBy) === String(actor.sub);
  if (!canView) throw new AppError("You don't have access to this import job.", 403);
  return job;
}

export async function getImportJobStatus(jobId, actor) {
  const job = await loadJobForActor(jobId, actor);

  return {
    jobId: String(job._id),
    status: job.status,
    totalRows: job.totalRows ?? null,
    queuedCount: job.queuedCount ?? null,
    processedCount: job.processedCount ?? 0,
    successCount: job.successCount ?? 0,
    failureCount: job.failureCount ?? 0,
    errorCount: job.errorCount ?? 0,
    errorMessage: job.errorMessage ?? null,
    hasErrorReport: (job.rowErrors?.length ?? 0) > 0,
    createdAt: job.createdAt ?? null,
    completedAt: job.completedAt ?? null,
    finishedAt: job.finishedAt ?? null,
  };
}

// CSV listing every row that was rejected by validation or failed to import.
export async function getImportErrorReportCsv(jobId, actor) {
  const job = await loadJobForActor(jobId, actor);
  if (!job.rowErrors?.length) throw new AppError("This import job has no errors to report.", 404);

  const header = ["Row", "Name", "Class", "Section", "RollNo", "DOB", "Stage", "Error"];
  const lines = job.rowErrors.map((e) =>
    [e.rowNumber, e.name, e.class, e.section, e.rollNo, e.dob, e.stage, e.message].map(escapeCsv).join(","),
  );
  return [header.join(","), ...lines].join("\n") + "\n";
}
