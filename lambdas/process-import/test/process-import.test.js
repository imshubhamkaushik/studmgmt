import test from "node:test";
import assert from "node:assert/strict";
import { processImportObject } from "../index.mjs";

function fakeS3({ csvText }) {
  const calls = [];
  return {
    calls,
    send: async (command) => {
      calls.push(command);
      if (command.constructor.name === "GetObjectCommand") {
        return { Body: { transformToString: async () => csvText } };
      }
      return {}; // PutObjectCommand (error report)
    },
  };
}

function fakeSqs() {
  const calls = [];
  return {
    calls,
    send: async (command) => {
      calls.push(command);
      return {};
    },
  };
}

function fakeDynamo() {
  const calls = [];
  return {
    calls,
    send: async (command) => {
      calls.push(command);
      return {};
    },
  };
}

const baseArgs = { bucket: "test-bucket", key: "uploads/admin-1/job-123.csv", jobsTable: "test-jobs", queueUrl: "https://sqs.test/queue" };

test("valid rows are queued, no error report is written", async () => {
  const csv = "name,rollNo,class,section,dob\nAda Lovelace,1,10,A,2010-01-01\nAlan Turing,2,10,A,2009-06-23\n";
  const s3Client = fakeS3({ csvText: csv });
  const sqsClient = fakeSqs();
  const docClient = fakeDynamo();

  const result = await processImportObject({ ...baseArgs, s3Client, sqsClient, docClient });

  assert.equal(result.accepted, 2);
  assert.equal(result.rejected, 0);
  assert.equal(result.failed, false);

  assert.equal(sqsClient.calls.length, 1, "2 rows fit in a single SendMessageBatch call");
  assert.equal(sqsClient.calls[0].input.Entries.length, 2);

  const putCalls = s3Client.calls.filter((c) => c.constructor.name === "PutObjectCommand");
  assert.equal(putCalls.length, 0, "no error report should be written when nothing failed");

  const updateCall = docClient.calls.find((c) => c.constructor.name === "UpdateCommand");
  assert.equal(updateCall.input.ExpressionAttributeValues[":status"], "queued");
  assert.equal(updateCall.input.ExpressionAttributeValues[":queued"], 2);
  assert.equal(updateCall.input.ExpressionAttributeValues[":errors"], 0);
});

test("invalid rows are rejected individually and don't block valid ones in the same file", async () => {
  const csv = [
    "name,rollNo,class,section,dob",
    "Ada Lovelace,1,10,A,2010-01-01", // valid
    "X,2,10,A,2009-06-23", // invalid: name too short
    "Grace Hopper,not-a-number,10,A,1906-12-09", // invalid: rollNo not numeric
  ].join("\n");

  const s3Client = fakeS3({ csvText: csv });
  const sqsClient = fakeSqs();
  const docClient = fakeDynamo();

  const result = await processImportObject({ ...baseArgs, s3Client, sqsClient, docClient });

  assert.equal(result.accepted, 1);
  assert.equal(result.rejected, 2);
  assert.equal(result.failed, false);

  assert.equal(sqsClient.calls[0].input.Entries.length, 1, "only the valid row is queued");

  const putCalls = s3Client.calls.filter((c) => c.constructor.name === "PutObjectCommand");
  assert.equal(putCalls.length, 1, "an error report is written when something failed");
  const report = JSON.parse(putCalls[0].input.Body);
  assert.equal(report.length, 2);
  assert.equal(report[0].row, 3); // header is row 1, first data row is row 2
});

test("a CSV over 500 rows is rejected outright, nothing is queued", async () => {
  const header = "name,rollNo,class,section,dob";
  const rows = Array.from({ length: 501 }, (_, i) => `Student ${i},${i + 1},10,A,2010-01-01`);
  const csv = [header, ...rows].join("\n");

  const s3Client = fakeS3({ csvText: csv });
  const sqsClient = fakeSqs();
  const docClient = fakeDynamo();

  const result = await processImportObject({ ...baseArgs, s3Client, sqsClient, docClient });

  assert.equal(result.failed, true);
  assert.equal(sqsClient.calls.length, 0);

  const updateCall = docClient.calls.find((c) => c.constructor.name === "UpdateCommand");
  assert.equal(updateCall.input.ExpressionAttributeValues[":status"], "failed");
});

test("more than 10 valid rows are split across multiple SendMessageBatch calls", async () => {
  const header = "name,rollNo,class,section,dob";
  const rows = Array.from({ length: 23 }, (_, i) => `Student ${i},${i + 1},10,A,2010-01-01`);
  const csv = [header, ...rows].join("\n");

  const s3Client = fakeS3({ csvText: csv });
  const sqsClient = fakeSqs();
  const docClient = fakeDynamo();

  const result = await processImportObject({ ...baseArgs, s3Client, sqsClient, docClient });

  assert.equal(result.accepted, 23);
  assert.equal(sqsClient.calls.length, 3); // 10 + 10 + 3, SendMessageBatch caps at 10
  assert.equal(sqsClient.calls[0].input.Entries.length, 10);
  assert.equal(sqsClient.calls[1].input.Entries.length, 10);
  assert.equal(sqsClient.calls[2].input.Entries.length, 3);
});

test("an empty CSV is rejected rather than silently succeeding with zero rows", async () => {
  const s3Client = fakeS3({ csvText: "name,rollNo,class,section,dob\n" });
  const sqsClient = fakeSqs();
  const docClient = fakeDynamo();

  const result = await processImportObject({ ...baseArgs, s3Client, sqsClient, docClient });

  assert.equal(result.failed, true);
});
