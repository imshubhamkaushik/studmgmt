import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { SQSClient, SendMessageBatchCommand } from "@aws-sdk/client-sqs";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { parse } from "csv-parse/sync";
import { propagation, context } from "@opentelemetry/api";
import { normalizeAndValidateStudentPayload, ValidationError } from "../../shared/student-validation.mjs";

// The Lambda invocation span (created automatically by the ADOT layer —
// see AWS_LAMBDA_EXEC_WRAPPER in terraform/lambdas.tf) ends when this
// function returns. Without explicitly injecting the current trace
// context into each SQS message, import-consumer.js processing that
// message later would start a brand new, disconnected trace — this is
// what makes "one trace from upload through to the database write"
// possible instead of two separate unrelated traces either side of the
// queue.
function traceparentAttribute() {
  const carrier = {};
  propagation.inject(context.active(), carrier);
  return carrier.traceparent ? { traceparent: { DataType: "String", StringValue: carrier.traceparent } } : {};
}

const MAX_ROWS = 500;
const SQS_BATCH_SIZE = 10; // SendMessageBatch's hard limit, not a tunable

async function markJobFailed(docClient, jobsTable, jobId, message) {
  await docClient.send(
    new UpdateCommand({
      TableName: jobsTable,
      Key: { jobId },
      UpdateExpression: "SET #status = :status, errorMessage = :msg, completedAt = :now",
      ExpressionAttributeNames: { "#status": "status" },
      ExpressionAttributeValues: { ":status": "failed", ":msg": message, ":now": new Date().toISOString() },
    }),
  );
}

// Core logic, independent of the EventBridge event envelope and with its
// AWS clients passed in — unit tested against fake clients rather than
// real S3/SQS/DynamoDB.
export async function processImportObject({ bucket, key, jobsTable, queueUrl, s3Client, sqsClient, docClient }) {
  const jobId = key.split("/").pop().replace(/\.csv$/i, "");

  const object = await s3Client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const csvText = await object.Body.transformToString("utf-8");

  let rows;
  try {
    rows = parse(csvText, { columns: true, skip_empty_lines: true, trim: true });
  } catch (error) {
    await markJobFailed(docClient, jobsTable, jobId, `Could not parse CSV: ${error.message}`);
    return { jobId, accepted: 0, rejected: 0, failed: true };
  }

  if (rows.length === 0) {
    await markJobFailed(docClient, jobsTable, jobId, "CSV contained no rows.");
    return { jobId, accepted: 0, rejected: 0, failed: true };
  }

  if (rows.length > MAX_ROWS) {
    await markJobFailed(docClient, jobsTable, jobId, `CSV cannot contain more than ${MAX_ROWS} rows.`);
    return { jobId, accepted: 0, rejected: 0, failed: true };
  }

  const accepted = [];
  const rejected = [];

  // Same validation function the synchronous /students/import endpoint
  // uses — see shared/student-validation.mjs. A row that would be
  // rejected by the API is rejected here for the same reason, and vice
  // versa, by construction rather than by two implementations agreeing.
  rows.forEach((row, index) => {
    try {
      const student = normalizeAndValidateStudentPayload(row);
      accepted.push({ row: index + 2, student }); // +2: header row + 1-indexing
    } catch (error) {
      const message = error instanceof ValidationError ? error.message : "Unexpected validation error.";
      rejected.push({ row: index + 2, message, raw: row });
    }
  });

  for (let i = 0; i < accepted.length; i += SQS_BATCH_SIZE) {
    const batch = accepted.slice(i, i + SQS_BATCH_SIZE);
    await sqsClient.send(
      new SendMessageBatchCommand({
        QueueUrl: queueUrl,
        Entries: batch.map((item, idx) => ({
          Id: String(i + idx),
          MessageBody: JSON.stringify({ jobId, row: item.row, student: item.student }),
          MessageAttributes: traceparentAttribute(),
        })),
      }),
    );
  }

  let errorReportKey = null;
  if (rejected.length > 0) {
    errorReportKey = `reports/${jobId}-errors.json`;
    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: errorReportKey,
        Body: JSON.stringify(rejected, null, 2),
        ContentType: "application/json",
      }),
    );
  }

  await docClient.send(
    new UpdateCommand({
      TableName: jobsTable,
      Key: { jobId },
      UpdateExpression:
        "SET #status = :status, totalRows = :total, queuedCount = :queued, errorCount = :errors, errorReportKey = :report, completedAt = :now",
      ExpressionAttributeNames: { "#status": "status" },
      ExpressionAttributeValues: {
        ":status": "queued",
        ":total": rows.length,
        ":queued": accepted.length,
        ":errors": rejected.length,
        ":report": errorReportKey,
        ":now": new Date().toISOString(),
      },
    }),
  );

  return { jobId, accepted: accepted.length, rejected: rejected.length, failed: false };
}

// Thin adapter for the EventBridge S3-object-created event envelope.
export const handler = async (event) => {
  const s3Client = new S3Client({});
  const sqsClient = new SQSClient({});
  const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

  const bucket = event.detail.bucket.name;
  const key = decodeURIComponent(event.detail.object.key.replace(/\+/g, " "));

  return processImportObject({
    bucket,
    key,
    jobsTable: process.env.JOBS_TABLE,
    queueUrl: process.env.IMPORT_QUEUE_URL,
    s3Client,
    sqsClient,
    docClient,
  });
};
