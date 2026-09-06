import test from "node:test";
import assert from "node:assert/strict";
import { processMessage } from "../src/workers/import-consumer.js";

function fakeDocClient(jobState) {
  const calls = [];
  return {
    calls,
    send: async (command) => {
      calls.push(command);
      const name = command.constructor.name;

      if (name === "UpdateCommand") {
        const values = command.input.ExpressionAttributeValues;
        if (values[":one"] !== undefined) {
          jobState.processedCount = (jobState.processedCount || 0) + values[":one"];
          if (command.input.UpdateExpression.includes("successCount"))
            jobState.successCount = (jobState.successCount || 0) + values[":one"];
          if (command.input.UpdateExpression.includes("failureCount"))
            jobState.failureCount = (jobState.failureCount || 0) + values[":one"];
        }
        if (values[":status"]) jobState.status = values[":status"];
        return {};
      }

      if (name === "GetCommand") {
        return { Item: { ...jobState } };
      }

      return {};
    },
  };
}

function fakeSns() {
  const calls = [];
  return { calls, send: async (command) => { calls.push(command); return {}; } };
}

function message(body) {
  return { Body: JSON.stringify(body), ReceiptHandle: "test-receipt-handle" };
}

test("a successful row increments processedCount and successCount", async () => {
  const jobState = { jobId: "job-1", queuedCount: 3, processedCount: 0, successCount: 0, failureCount: 0 };
  const docClient = fakeDocClient(jobState);
  const snsClient = fakeSns();

  await processMessage(message({ jobId: "job-1", row: 2, student: { name: "Ada" } }), {
    docClient,
    snsClient,
    jobsTable: "test-jobs",
    notificationsTopicArn: "arn:aws:sns:us-east-1:123456789012:test-topic",
    createStudentFn: async () => ({ _id: "fake-id" }),
  });

  assert.equal(jobState.processedCount, 1);
  assert.equal(jobState.successCount, 1);
  assert.equal(jobState.failureCount, 0);
  assert.notEqual(jobState.status, "completed", "job isn't done until processedCount reaches queuedCount");
  assert.equal(snsClient.calls.length, 0);
});

test("a row that fails createStudent is recorded as a failure, not silently dropped", async () => {
  const jobState = { jobId: "job-2", queuedCount: 1, processedCount: 0, successCount: 0, failureCount: 0 };
  const docClient = fakeDocClient(jobState);
  const snsClient = fakeSns();

  await processMessage(message({ jobId: "job-2", row: 5, student: { name: "Dup" } }), {
    docClient,
    snsClient,
    jobsTable: "test-jobs",
    notificationsTopicArn: "arn:aws:sns:us-east-1:123456789012:test-topic",
    createStudentFn: async () => {
      throw new Error("Roll number 5 already exists in Class 10, Section A.");
    },
  });

  assert.equal(jobState.failureCount, 1);
  assert.equal(jobState.successCount, 0);
  // Job is complete (processedCount reached queuedCount) even though the
  // one row that made it up failed — completion tracks "processed", not
  // "succeeded".
  assert.equal(jobState.status, "completed");
  assert.equal(snsClient.calls.length, 1, "completion should fire exactly one notification");
});

test("processing the last of several queued rows triggers exactly one completion notification", async () => {
  const jobState = { jobId: "job-3", queuedCount: 3, processedCount: 2, successCount: 2, failureCount: 0 };
  const docClient = fakeDocClient(jobState);
  const snsClient = fakeSns();

  await processMessage(message({ jobId: "job-3", row: 4, student: { name: "Last Row" } }), {
    docClient,
    snsClient,
    jobsTable: "test-jobs",
    notificationsTopicArn: "arn:aws:sns:us-east-1:123456789012:test-topic",
    createStudentFn: async () => ({ _id: "fake-id" }),
  });

  assert.equal(jobState.processedCount, 3);
  assert.equal(jobState.status, "completed");
  assert.equal(snsClient.calls.length, 1);
  assert.match(snsClient.calls[0].input.Message, /3 of 3 queued rows/);
});

test("a row that isn't the last one processed doesn't trigger a notification", async () => {
  const jobState = { jobId: "job-4", queuedCount: 5, processedCount: 1, successCount: 1, failureCount: 0 };
  const docClient = fakeDocClient(jobState);
  const snsClient = fakeSns();

  await processMessage(message({ jobId: "job-4", row: 3, student: { name: "Middle Row" } }), {
    docClient,
    snsClient,
    jobsTable: "test-jobs",
    notificationsTopicArn: "arn:aws:sns:us-east-1:123456789012:test-topic",
    createStudentFn: async () => ({ _id: "fake-id" }),
  });

  assert.equal(jobState.processedCount, 2);
  assert.notEqual(jobState.status, "completed");
  assert.equal(snsClient.calls.length, 0);
});
