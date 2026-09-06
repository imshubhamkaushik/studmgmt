import { S3Client, HeadObjectCommand } from "@aws-sdk/client-s3";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { propagation, context } from "@opentelemetry/api";

// Same reasoning as lambdas/process-import/index.mjs's identical
// helper: without this, submission-consumer.js processing this message
// would start a disconnected trace instead of continuing the one that
// began with the upload.
function traceparentAttribute() {
  const carrier = {};
  propagation.inject(context.active(), carrier);
  return carrier.traceparent ? { traceparent: { DataType: "String", StringValue: carrier.traceparent } } : {};
}

// S3's presigned POST condition already enforces the size limit (see
// requestSubmissionUploadUrlFor* in assignment-submission.service.js) —
// anything oversized never lands in the bucket at all, so this Lambda
// only needs to check file type, which the presigned POST deliberately
// doesn't restrict (submissions are a mix of PDFs, docs, and images).
const ALLOWED_EXTENSIONS = new Set([".pdf", ".doc", ".docx", ".jpg", ".jpeg", ".png"]);

function extensionOf(key) {
  const match = /\.[a-zA-Z0-9]+$/.exec(key);
  return match ? match[0].toLowerCase() : "";
}

// submissionId is the first path segment after "submissions/" — see the
// key scheme in assignment-submission.service.js's createPendingSubmission.
function submissionIdFromKey(key) {
  const parts = key.split("/");
  return parts[1];
}

// Core logic, independent of the EventBridge envelope, with clients
// passed in for testing.
export async function validateSubmissionObject({ bucket, key, queueUrl, s3Client, sqsClient }) {
  const submissionId = submissionIdFromKey(key);
  if (!submissionId) {
    // Malformed key — nothing sensible to report back to, so this is
    // logged and dropped rather than queued under a bogus id.
    console.error(JSON.stringify({ level: "error", message: "could not parse submissionId from key", key }));
    return { skipped: true };
  }

  const extension = extensionOf(key);
  if (!ALLOWED_EXTENSIONS.has(extension)) {
    await sqsClient.send(
      new SendMessageCommand({
        QueueUrl: queueUrl,
        MessageBody: JSON.stringify({
          submissionId,
          valid: false,
          reason: `File type "${extension || "unknown"}" is not allowed.`,
        }),
        MessageAttributes: traceparentAttribute(),
      }),
    );
    return { submissionId, valid: false };
  }

  const head = await s3Client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));

  await sqsClient.send(
    new SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: JSON.stringify({
        submissionId,
        valid: true,
        sizeBytes: head.ContentLength,
        mimeType: head.ContentType || null,
      }),
      MessageAttributes: traceparentAttribute(),
    }),
  );

  return { submissionId, valid: true };
}

export const handler = async (event) => {
  const s3Client = new S3Client({});
  const sqsClient = new SQSClient({});

  const bucket = event.detail.bucket.name;
  const key = decodeURIComponent(event.detail.object.key.replace(/\+/g, " "));

  return validateSubmissionObject({ bucket, key, queueUrl: process.env.SUBMISSION_QUEUE_URL, s3Client, sqsClient });
};
