import test from "node:test";
import assert from "node:assert/strict";
import { validateSubmissionObject } from "../index.mjs";

function fakeS3({ contentLength = 2048, contentType = "application/pdf" } = {}) {
  const calls = [];
  return {
    calls,
    send: async (command) => {
      calls.push(command);
      return { ContentLength: contentLength, ContentType: contentType };
    },
  };
}

function fakeSqs() {
  const calls = [];
  return { calls, send: async (command) => { calls.push(command); return {}; } };
}

const baseArgs = { bucket: "test-bucket", queueUrl: "https://sqs.test/queue" };

test("an allowed file type is accepted and queued as valid", async () => {
  const s3Client = fakeS3({ contentLength: 4096, contentType: "application/pdf" });
  const sqsClient = fakeSqs();

  const result = await validateSubmissionObject({
    ...baseArgs,
    key: "submissions/64f1a2b3c4d5e6f7a8b9c0d1/essay.pdf",
    s3Client,
    sqsClient,
  });

  assert.equal(result.valid, true);
  assert.equal(result.submissionId, "64f1a2b3c4d5e6f7a8b9c0d1");
  assert.equal(sqsClient.calls.length, 1);
  const body = JSON.parse(sqsClient.calls[0].input.MessageBody);
  assert.equal(body.valid, true);
  assert.equal(body.sizeBytes, 4096);
});

test("a disallowed file type is rejected without even checking S3 metadata", async () => {
  const s3Client = fakeS3();
  const sqsClient = fakeSqs();

  const result = await validateSubmissionObject({
    ...baseArgs,
    key: "submissions/64f1a2b3c4d5e6f7a8b9c0d1/script.exe",
    s3Client,
    sqsClient,
  });

  assert.equal(result.valid, false);
  assert.equal(s3Client.calls.length, 0, "no reason to HeadObject a file type we're rejecting outright");
  const body = JSON.parse(sqsClient.calls[0].input.MessageBody);
  assert.equal(body.valid, false);
  assert.match(body.reason, /not allowed/);
});

test("each allowed extension is genuinely accepted, not just .pdf", async () => {
  for (const ext of [".pdf", ".doc", ".docx", ".jpg", ".jpeg", ".png"]) {
    const sqsClient = fakeSqs();
    const result = await validateSubmissionObject({
      ...baseArgs,
      key: `submissions/64f1a2b3c4d5e6f7a8b9c0d1/file${ext}`,
      s3Client: fakeS3(),
      sqsClient,
    });
    assert.equal(result.valid, true, `${ext} should be accepted`);
  }
});

test("a key without a recognizable submissionId is dropped, not queued under a bogus id", async () => {
  const s3Client = fakeS3();
  const sqsClient = fakeSqs();

  const result = await validateSubmissionObject({
    ...baseArgs,
    key: "submissions/",
    s3Client,
    sqsClient,
  });

  assert.equal(result.skipped, true);
  assert.equal(sqsClient.calls.length, 0);
});
