// Same standing-process shape as the other workers — same image,
// different CMD (see k8s/18-audit-archive-worker-deployment.yaml).
//
// Unlike import-consumer and submission-consumer, this worker is NOT the
// source of truth for anything — audit.service.js's synchronous
// AuditLog.create() already wrote the authoritative record before this
// event was ever published (see the comment there for why that write
// stays synchronous). This worker's only job is durable, cheap long-term
// archival: batching events and appending them to dated NDJSON files in
// S3, which can carry a lifecycle policy to Glacier for cost, without
// ever touching the operational database's retention.
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } from "@aws-sdk/client-sqs";
import { randomUUID } from "node:crypto";

const QUEUE_URL = process.env.AUDIT_ARCHIVE_QUEUE_URL;
const BUCKET = process.env.AUDIT_ARCHIVE_BUCKET;
const FLUSH_SIZE = 25;
const FLUSH_INTERVAL_MS = 30_000;

// Pure — easy to unit test without S3. Each line is one audit event as
// its own JSON object, the standard newline-delimited-JSON shape most
// log-archival tooling (Athena, jq, etc.) expects.
export function formatBatchAsNdjson(events) {
  return events.map((event) => JSON.stringify(event)).join("\n") + "\n";
}

function archiveKeyFor(date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `audit-archive/${y}/${m}/${d}/${date.getTime()}-${randomUUID()}.ndjson`;
}

// Exported for testing — S3 client and bucket passed in, same DI pattern
// as every other worker/Lambda in this repo.
export async function flushBatch(events, { s3Client, bucket }) {
  if (!events.length) return { flushed: false };

  const key = archiveKeyFor(new Date());
  await s3Client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: formatBatchAsNdjson(events),
      ContentType: "application/x-ndjson",
    }),
  );

  return { flushed: true, key, count: events.length };
}

// EventBridge-via-SQS wraps the actual event under .detail — this parses
// that envelope. A message that doesn't match the expected shape is
// logged and skipped rather than crashing the batch.
function parseMessage(message) {
  try {
    const body = JSON.parse(message.Body);
    return body.detail || null;
  } catch {
    return null;
  }
}

export async function runWorker() {
  const s3Client = new S3Client({});
  const sqsClient = new SQSClient({});

  console.log(JSON.stringify({ level: "info", message: "audit-archive-worker started", queueUrl: QUEUE_URL, bucket: BUCKET }));

  let batch = [];
  let batchReceiptHandles = [];
  let lastFlush = Date.now();

  const flush = async () => {
    if (!batch.length) return;
    try {
      const result = await flushBatch(batch, { s3Client, bucket: BUCKET });
      await Promise.all(
        batchReceiptHandles.map((ReceiptHandle) => sqsClient.send(new DeleteMessageCommand({ QueueUrl: QUEUE_URL, ReceiptHandle }))),
      );
      console.log(JSON.stringify({ level: "info", message: "archived audit batch", ...result }));
    } catch (error) {
      // Messages are deliberately left on the queue on failure — they
      // become visible again after the visibility timeout and this batch
      // is retried from scratch, same reasoning as every other worker
      // in this repo.
      console.error(JSON.stringify({ level: "error", message: "failed to archive audit batch, leaving for retry", error: error.message }));
    }
    batch = [];
    batchReceiptHandles = [];
    lastFlush = Date.now();
  };

  for (;;) {
    const { Messages } = await sqsClient.send(
      new ReceiveMessageCommand({
        QueueUrl: QUEUE_URL,
        MaxNumberOfMessages: 10,
        WaitTimeSeconds: 10, // shorter than the other workers' 20s — this one also needs to notice the flush-interval timeout promptly
        VisibilityTimeout: 60,
      }),
    );

    for (const message of Messages || []) {
      const event = parseMessage(message);
      if (event) {
        batch.push(event);
        batchReceiptHandles.push(message.ReceiptHandle);
      } else {
        // Malformed message — delete it directly rather than let it
        // clog the queue forever; there's nothing a retry would fix.
        await sqsClient.send(new DeleteMessageCommand({ QueueUrl: QUEUE_URL, ReceiptHandle: message.ReceiptHandle }));
      }
    }

    if (batch.length >= FLUSH_SIZE || (batch.length > 0 && Date.now() - lastFlush >= FLUSH_INTERVAL_MS)) {
      await flush();
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runWorker().catch((error) => {
    console.error(JSON.stringify({ level: "error", message: "audit-archive-worker crashed", error: error.message, stack: error.stack }));
    process.exit(1);
  });
}
