// Same shape as import-consumer.js: a standing process, same Docker
// image, different CMD (see k8s/13-submission-worker-deployment.yaml).
// process-submission's Lambda already decided valid/invalid; this worker
// only ever writes the outcome and notifies — it never re-validates.
import { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } from "@aws-sdk/client-sqs";
import { trace, context, propagation, SpanKind } from "@opentelemetry/api";
import { connectDatabase } from "../config/db.js";
import { AssignmentSubmission } from "../models/assignment-submission.model.js";
import { Student } from "../models/student.model.js";
import { notifyUser } from "../services/notification.service.js";

const tracer = trace.getTracer("studmgmt-submission-worker");

// Same reasoning and mechanics as import-consumer.js's identical
// function — see that file's comment for the full explanation, including
// why this needs both a registered propagator AND a registered context
// manager to actually work (see test/trace-propagation.test.js).
export async function withExtractedTraceContext(message, fn) {
  const traceparent = message.MessageAttributes?.traceparent?.StringValue;
  if (!traceparent) return fn();

  const parentContext = propagation.extract(context.active(), { traceparent });
  return context.with(parentContext, () =>
    tracer.startActiveSpan("submission-consumer.processMessage", { kind: SpanKind.CONSUMER }, async (span) => {
      try {
        return await fn();
      } finally {
        span.end();
      }
    }),
  );
}

const QUEUE_URL = process.env.SUBMISSION_QUEUE_URL;

// Exported for testing — every DB touch is injectable with a default
// pointing at the real implementation, same pattern as import-consumer's
// createStudentFn. A unit test can swap all three for fakes and never
// touch a database; the real defaults are what runWorker() below uses.
export async function processSubmissionMessage(
  message,
  {
    findSubmission = (id) => AssignmentSubmission.findById(id).populate("assignment"),
    findStudentName = async (id) => (await Student.findById(id).select("name").lean())?.name,
    notifyUserFn = notifyUser,
  } = {},
) {
  const { submissionId, valid, reason, sizeBytes, mimeType } = JSON.parse(message.Body);

  const submission = await findSubmission(submissionId);
  if (!submission) {
    console.error(JSON.stringify({ level: "error", message: "submission not found for queued result", submissionId }));
    return { found: false };
  }

  if (!valid) {
    submission.status = "rejected";
    submission.rejectionReason = reason;
    await submission.save();
    return { found: true, accepted: false };
  }

  const isLate = new Date() > submission.assignment.dueDate;
  submission.status = isLate ? "late" : "submitted";
  submission.file.sizeBytes = sizeBytes;
  if (mimeType) submission.file.mimeType = mimeType;
  await submission.save();

  const studentName = await findStudentName(submission.student);

  // Best-effort — a notification failure shouldn't undo a submission
  // that was already recorded successfully.
  await notifyUserFn(submission.assignment.teacher, {
    type: "submission_received",
    title: "New submission received",
    body: `${studentName || "A student"} submitted "${submission.assignment.title}".`,
  }).catch(() => {});

  return { found: true, accepted: true, isLate };
}

export async function runWorker() {
  await connectDatabase();

  const sqsClient = new SQSClient({});

  console.log(JSON.stringify({ level: "info", message: "submission-consumer started", queueUrl: QUEUE_URL }));

  for (;;) {
    const { Messages } = await sqsClient.send(
      new ReceiveMessageCommand({
        QueueUrl: QUEUE_URL,
        MaxNumberOfMessages: 10,
        WaitTimeSeconds: 20,
        VisibilityTimeout: 30,
        MessageAttributeNames: ["traceparent"],
      }),
    );

    for (const message of Messages || []) {
      try {
        await withExtractedTraceContext(message, () => processSubmissionMessage(message));
        await sqsClient.send(new DeleteMessageCommand({ QueueUrl: QUEUE_URL, ReceiptHandle: message.ReceiptHandle }));
      } catch (error) {
        // Left on the queue on purpose — same reasoning as
        // import-consumer.js: an unexpected error should be retried, and
        // the DLQ's redrive policy handles giving up after enough tries.
        console.error(
          JSON.stringify({ level: "error", message: "failed to process submission message, leaving for retry", error: error.message }),
        );
      }
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runWorker().catch((error) => {
    console.error(JSON.stringify({ level: "error", message: "submission-consumer crashed", error: error.message, stack: error.stack }));
    process.exit(1);
  });
}
