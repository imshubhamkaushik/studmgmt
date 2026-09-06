// Runs as a separate process from the API server — same Docker image,
// different CMD (see k8s/10-import-worker-deployment.yaml). This is the
// EKS side of the CSV import pipeline: it never talks to S3 or parses
// CSV at all, it only ever sees rows that process-import already
// validated and queued, and writes them with the exact same
// createStudent() the synchronous API endpoint uses — so a row imported
// via this pipeline and one created through the API go through
// identical business logic (studentId generation, portal account
// provisioning, audit logging), not two parallel implementations.
import { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } from "@aws-sdk/client-sqs";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { trace, context, propagation, SpanKind } from "@opentelemetry/api";
import { connectDatabase } from "../config/db.js";
import { createStudent } from "../services/student.service.js";

const tracer = trace.getTracer("studmgmt-import-worker");

// Exported for testing. process-import's Lambda injects a traceparent
// message attribute before sending (see lambdas/process-import/index.mjs)
// — extracting it here and running fn() inside a linked span is what
// makes one trace show the full path (upload -> Lambda validation ->
// SQS -> this write) instead of two disconnected traces either side of
// the queue. Falls back to calling fn() directly, un-traced, if the
// message has no traceparent — a missing attribute should never block
// processing.
export async function withExtractedTraceContext(message, fn) {
  const traceparent = message.MessageAttributes?.traceparent?.StringValue;
  if (!traceparent) return fn();

  const parentContext = propagation.extract(context.active(), { traceparent });
  return context.with(parentContext, () =>
    tracer.startActiveSpan("import-consumer.processMessage", { kind: SpanKind.CONSUMER }, async (span) => {
      try {
        return await fn();
      } finally {
        span.end();
      }
    }),
  );
}

const QUEUE_URL = process.env.IMPORT_QUEUE_URL;

// Increments the job's processed/success/failure counters atomically (ADD
// is safe under concurrent messages from the same job), then reads the
// item back to decide whether this was the last row — avoids a
// read-then-write race between multiple in-flight messages for one job.
async function recordOutcomeAndMaybeComplete(docClient, snsClient, jobsTable, notificationsTopicArn, jobId, { succeeded, errorDetail }) {
  await docClient.send(
    new UpdateCommand({
      TableName: jobsTable,
      Key: { jobId },
      UpdateExpression: succeeded
        ? "ADD processedCount :one, successCount :one"
        : "ADD processedCount :one, failureCount :one SET consumerErrors = list_append(if_not_exists(consumerErrors, :empty), :error)",
      ExpressionAttributeValues: succeeded
        ? { ":one": 1 }
        : { ":one": 1, ":empty": [], ":error": [errorDetail] },
    }),
  );

  const { Item: job } = await docClient.send(new GetCommand({ TableName: jobsTable, Key: { jobId } }));
  if (!job || job.processedCount < job.queuedCount) return;

  await docClient.send(
    new UpdateCommand({
      TableName: jobsTable,
      Key: { jobId },
      UpdateExpression: "SET #status = :status, finishedAt = :now",
      ExpressionAttributeNames: { "#status": "status" },
      ExpressionAttributeValues: { ":status": "completed", ":now": new Date().toISOString() },
    }),
  );

  if (notificationsTopicArn) {
    await snsClient.send(
      new PublishCommand({
        TopicArn: notificationsTopicArn,
        Subject: "Student import finished",
        Message: [
          `Import job ${jobId} finished.`,
          `${job.successCount || 0} of ${job.queuedCount} queued rows were created successfully.`,
          job.failureCount ? `${job.failureCount} row(s) failed after being queued — see the job record for details.` : "",
          job.errorCount ? `${job.errorCount} row(s) were rejected before queuing — see the error report in S3.` : "",
        ]
          .filter(Boolean)
          .join("\n"),
      }),
    );
  }
}

// Exported for testing — everything DB/AWS-touching, plus every
// environment-derived value, is passed in rather than read from
// module-level state, so a test never has to worry about env vars having
// been set before this module was first imported.
export async function processMessage(message, { docClient, snsClient, jobsTable, notificationsTopicArn, createStudentFn = createStudent }) {
  const { jobId, row, student } = JSON.parse(message.Body);

  try {
    await createStudentFn(student);
    await recordOutcomeAndMaybeComplete(docClient, snsClient, jobsTable, notificationsTopicArn, jobId, { succeeded: true });
  } catch (error) {
    // A duplicate roll number or similar business-rule conflict is not
    // going to succeed on retry, so it's recorded as a permanent failure
    // for this row rather than left on the queue.
    await recordOutcomeAndMaybeComplete(docClient, snsClient, jobsTable, notificationsTopicArn, jobId, {
      succeeded: false,
      errorDetail: { row, message: error.message },
    });
  }
}

// Exported for testing — this is the actual resilience property worth
// proving: an unexpected failure must leave the message on the queue
// (so SQS's visibility timeout + redrive policy can retry it) rather
// than deleting it and silently losing the row. See
// test/resilience.test.js.
export async function handleOneMessage(message, { sqsClient, docClient, snsClient, jobsTable, notificationsTopicArn, createStudentFn }) {
  try {
    await withExtractedTraceContext(message, () =>
      processMessage(message, { docClient, snsClient, jobsTable, notificationsTopicArn, ...(createStudentFn && { createStudentFn }) }),
    );
    await sqsClient.send(new DeleteMessageCommand({ QueueUrl: QUEUE_URL, ReceiptHandle: message.ReceiptHandle }));
    return { deleted: true };
  } catch (error) {
    // Left on the queue on purpose: an unexpected error (DB
    // connection drop, DynamoDB throttling) should be retried, and
    // the queue's redrive policy sends it to the DLQ after enough
    // attempts rather than this worker deciding that itself.
    console.error(
      JSON.stringify({ level: "error", message: "failed to process import message, leaving for retry", error: error.message }),
    );
    return { deleted: false };
  }
}

export async function runWorker() {
  await connectDatabase();

  const sqsClient = new SQSClient({});
  const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
  const snsClient = new SNSClient({});
  const jobsTable = process.env.JOBS_TABLE;
  const notificationsTopicArn = process.env.IMPORT_NOTIFICATIONS_TOPIC_ARN;

  console.log(JSON.stringify({ level: "info", message: "import-consumer started", queueUrl: QUEUE_URL }));

  // Long-polling loop — intentionally never exits on its own; the process
  // is expected to run as a standing Deployment, restarted by Kubernetes
  // if it crashes.
  for (;;) {
    const { Messages } = await sqsClient.send(
      new ReceiveMessageCommand({
        QueueUrl: QUEUE_URL,
        MaxNumberOfMessages: 10,
        WaitTimeSeconds: 20,
        VisibilityTimeout: 60,
        // SQS does not return message attributes by default — without
        // this, the traceparent process-import attached would silently
        // never arrive here.
        MessageAttributeNames: ["traceparent"],
      }),
    );

    for (const message of Messages || []) {
      await handleOneMessage(message, { sqsClient, docClient, snsClient, jobsTable, notificationsTopicArn });
    }
  }
}

// Only auto-starts when run directly (the CMD in the worker Deployment),
// not when imported by tests.
if (import.meta.url === `file://${process.argv[1]}`) {
  runWorker().catch((error) => {
    console.error(JSON.stringify({ level: "error", message: "import-consumer crashed", error: error.message, stack: error.stack }));
    process.exit(1);
  });
}
