import test from "node:test";
import assert from "node:assert/strict";
import { S3Client } from "@aws-sdk/client-s3";
import { createUploadUrl } from "../index.mjs";
import { signAccessToken } from "../../../shared/jwt.mjs";

const JWT_SECRET = "test-secret-that-is-at-least-32-characters-long";

// Presigning a URL is pure local signing (HMAC over the request using the
// credentials), not a network call — a real S3Client with throwaway
// static credentials is enough, no AWS account or mocking needed for it.
const s3Client = new S3Client({ region: "us-east-1", credentials: { accessKeyId: "test", secretAccessKey: "test" } });

function fakeDocClient(calls) {
  return {
    send: async (command) => {
      calls.push(command);
      return {};
    },
  };
}

test("rejects a missing token", async () => {
  const calls = [];
  const response = await createUploadUrl({
    authorizationHeader: undefined,
    bucket: "test-bucket",
    jobsTable: "test-jobs",
    jwtSecret: JWT_SECRET,
    s3Client,
    docClient: fakeDocClient(calls),
  });
  assert.equal(response.statusCode, 401);
  assert.equal(calls.length, 0, "should never touch DynamoDB for a rejected request");
});

test("rejects a token with a role that isn't admin or staff", async () => {
  const token = signAccessToken({ sub: "student-1", role: "student" }, JWT_SECRET);
  const calls = [];
  const response = await createUploadUrl({
    authorizationHeader: `Bearer ${token}`,
    bucket: "test-bucket",
    jobsTable: "test-jobs",
    jwtSecret: JWT_SECRET,
    s3Client,
    docClient: fakeDocClient(calls),
  });
  assert.equal(response.statusCode, 403);
  assert.equal(calls.length, 0);
});

test("rejects an expired token", async () => {
  const token = signAccessToken({ sub: "admin-1", role: "admin" }, JWT_SECRET, -10);
  const response = await createUploadUrl({
    authorizationHeader: `Bearer ${token}`,
    bucket: "test-bucket",
    jobsTable: "test-jobs",
    jwtSecret: JWT_SECRET,
    s3Client,
    docClient: fakeDocClient([]),
  });
  assert.equal(response.statusCode, 401);
});

test("rejects a token signed with the wrong secret", async () => {
  const token = signAccessToken({ sub: "admin-1", role: "admin" }, "a-completely-different-secret-value");
  const response = await createUploadUrl({
    authorizationHeader: `Bearer ${token}`,
    bucket: "test-bucket",
    jobsTable: "test-jobs",
    jwtSecret: JWT_SECRET,
    s3Client,
    docClient: fakeDocClient([]),
  });
  assert.equal(response.statusCode, 401);
});

test("issues a presigned URL and creates an awaiting_upload job record for admin/staff", async () => {
  const token = signAccessToken({ sub: "admin-1", role: "admin" }, JWT_SECRET);
  const calls = [];
  const response = await createUploadUrl({
    authorizationHeader: `Bearer ${token}`,
    bucket: "test-bucket",
    jobsTable: "test-jobs",
    jwtSecret: JWT_SECRET,
    s3Client,
    docClient: fakeDocClient(calls),
  });

  assert.equal(response.statusCode, 200);
  const body = JSON.parse(response.body);
  assert.ok(body.data.uploadUrl.startsWith("https://test-bucket.s3."), "presigned URL should target the given bucket");
  assert.ok(body.data.jobId);
  assert.equal(body.data.key, `uploads/admin-1/${body.data.jobId}.csv`);

  assert.equal(calls.length, 1);
  assert.equal(calls[0].input.TableName, "test-jobs");
  assert.equal(calls[0].input.Item.status, "awaiting_upload");
  assert.equal(calls[0].input.Item.createdBy, "admin-1");
  assert.equal(calls[0].input.Item.jobId, body.data.jobId);
});

test("staff role is allowed, not just admin", async () => {
  const token = signAccessToken({ sub: "staff-1", role: "staff" }, JWT_SECRET);
  const response = await createUploadUrl({
    authorizationHeader: `Bearer ${token}`,
    bucket: "test-bucket",
    jobsTable: "test-jobs",
    jwtSecret: JWT_SECRET,
    s3Client,
    docClient: fakeDocClient([]),
  });
  assert.equal(response.statusCode, 200);
});
