import { startImportJob, getImportJobStatus, getImportErrorReportCsv } from "../services/import-job.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { AppError } from "../utils/AppError.js";

export const startJob = asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError("A CSV file is required (form field \"file\").", 400);
  const data = await startImportJob(
    { buffer: req.file.buffer, originalName: req.file.originalname },
    req.user,
    req.requestId,
  );
  res.status(202).json({ success: true, data });
});

export const getJobStatus = asyncHandler(async (req, res) => {
  const status = await getImportJobStatus(req.params.jobId, req.user);
  res.status(200).json({ success: true, data: status });
});

export const downloadErrorReport = asyncHandler(async (req, res) => {
  const csv = await getImportErrorReportCsv(req.params.jobId, req.user);
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="import-errors-${req.params.jobId}.csv"`);
  res.status(200).send(csv);
});
