import test from "node:test";
import assert from "node:assert/strict";
import { handleOneMessage } from "../src/workers/import-consumer.js";

// A minimal fake that can be told to throw on a specific call, simulating
// exactly the kind of transient infrastructure failure this property
// needs to survive (DynamoDB throttled, connection dropped mid-request).
function fakeDocClient({ throwOnUpdate = false } = {}) {
  const calls = [];
  return {
    calls,
    send: async (command) => {
      calls.push(command);
      if (throwOnUpdate && command.constructor.name === "UpdateCommand") {
        throw new Error("simulated DynamoDB throttling");
      }
      if (command.constructor.name === "GetCommand") return { Item: { queuedCount: 1, processedCount: 1 } };
      return {};
    },
  };
}

function fakeSqs() {
  const deleteCalls = [];
  return {
    deleteCalls,
    send: async (command) => {
      if (command.constructor.name === "DeleteMessageCommand") deleteCalls.push(command);
      return {};
    },
  };
}

function message(body) {
  return { Body: JSON.stringify(body), ReceiptHandle: "receipt-1", MessageAttributes: {} };
}

test("a message that processes successfully is deleted from the queue", async () => {
  const docClient = fakeDocClient();
  const sqsClient = fakeSqs();

  const result = await handleOneMessage(
    message({ jobId: "job-1", row: 2, student: { name: "Ada" } }),
    {
      sqsClient,
      docClient,
      snsClient: { send: async () => ({}) },
      jobsTable: "test-jobs",
      notificationsTopicArn: null,
      createStudentFn: async () => ({ _id: "fake-id" }),
    },
  );

  assert.equal(result.deleted, true);
  assert.equal(sqsClient.deleteCalls.length, 1, "a successfully processed message should be removed from the queue");
});

test("RESILIENCE: an unexpected infrastructure failure leaves the message on the queue for redelivery, it is not silently dropped", async () => {
  const docClient = fakeDocClient({ throwOnUpdate: true });
  const sqsClient = fakeSqs();

  const result = await handleOneMessage(
    message({ jobId: "job-2", row: 5, student: { name: "Grace" } }),
    {
      sqsClient,
      docClient,
      snsClient: { send: async () => ({}) },
      jobsTable: "test-jobs",
      notificationsTopicArn: null,
      createStudentFn: async () => ({ _id: "fake-id" }),
    },
  );

  assert.equal(result.deleted, false);
  assert.equal(
    sqsClient.deleteCalls.length,
    0,
    "DynamoDB throttling must not result in DeleteMessage being called — the row would be silently lost forever if it did, since SQS has no other record of it",
  );
});

test("RESILIENCE: a malformed message body fails safely and is left for redelivery rather than crashing the worker loop", async () => {
  const docClient = fakeDocClient();
  const sqsClient = fakeSqs();

  const malformedMessage = { Body: "{not valid json", ReceiptHandle: "receipt-2", MessageAttributes: {} };

  const result = await handleOneMessage(malformedMessage, {
    sqsClient,
    docClient,
    snsClient: { send: async () => ({}) },
    jobsTable: "test-jobs",
    notificationsTopicArn: null,
    createStudentFn: async () => ({ _id: "fake-id" }),
  });

  assert.equal(result.deleted, false);
  assert.equal(sqsClient.deleteCalls.length, 0);
});
