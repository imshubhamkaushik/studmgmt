import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { AppError } from "../utils/AppError.js";

// Exported for testing — DB/AWS clients and the table/bucket names are
// all passed in rather than constructed here, same pattern as the
// Lambdas and the import-consumer worker. The controller constructs real
// clients once at module load and passes them through.
export async function getImportJobStatus(jobId, actor, { jobsTable, importsBucket, docClient, s3Client }) {
  const { Item: job } = await docClient.send(new GetCommand({ TableName: jobsTable, Key: { jobId } }));

  if (!job) throw new AppError("Import job not found.", 404);

  const canView = actor.role === "admin" || job.createdBy === actor.sub;
  if (!canView) throw new AppError("You don't have access to this import job.", 403);

  let errorReportUrl = null;
  if (job.errorReportKey) {
    errorReportUrl = await getSignedUrl(
      s3Client,
      new GetObjectCommand({ Bucket: importsBucket, Key: job.errorReportKey }),
      { expiresIn: 300 },
    );
  }

  return {
    jobId: job.jobId,
    status: job.status,
    totalRows: job.totalRows ?? null,
    queuedCount: job.queuedCount ?? null,
    processedCount: job.processedCount ?? 0,
    successCount: job.successCount ?? 0,
    failureCount: job.failureCount ?? 0,
    errorCount: job.errorCount ?? 0,
    errorMessage: job.errorMessage ?? null,
    errorReportUrl,
    createdAt: job.createdAt ?? null,
    completedAt: job.completedAt ?? null,
    finishedAt: job.finishedAt ?? null,
  };
}
