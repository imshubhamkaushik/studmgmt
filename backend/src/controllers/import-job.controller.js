import { S3Client } from "@aws-sdk/client-s3";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { getImportJobStatus } from "../services/import-job.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Constructed once at module load, not per-request — these are cheap but
// there's no reason to rebuild them on every call.
const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const s3Client = new S3Client({});

export const getJobStatus = asyncHandler(async (req, res) => {
  const status = await getImportJobStatus(req.params.jobId, req.user, {
    jobsTable: process.env.JOBS_TABLE,
    importsBucket: process.env.IMPORTS_BUCKET,
    docClient,
    s3Client,
  });
  res.status(200).json({ success: true, data: status });
});
