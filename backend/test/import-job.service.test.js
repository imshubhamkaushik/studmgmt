import test from "node:test";
import assert from "node:assert/strict";
import { S3Client } from "@aws-sdk/client-s3";
import { getImportJobStatus } from "../src/services/import-job.service.js";

function fakeDocClient(item) {
  return { send: async () => ({ Item: item }) };
}

// Presigning is pure local signing, not a network call — a real S3Client
// with throwaway static credentials works without AWS access, same as
// lambdas/get-upload-url's tests.
const s3Client = new S3Client({ region: "us-east-1", credentials: { accessKeyId: "test", secretAccessKey: "test" } });

const opts = (job) => ({
  jobsTable: "test-jobs",
  importsBucket: "test-bucket",
  docClient: fakeDocClient(job),
  s3Client,
});

test("returns 404 when the job doesn't exist", async () => {
  await assert.rejects(
    () => getImportJobStatus("missing-job", { sub: "admin-1", role: "admin" }, opts(undefined)),
    (err) => err.statusCode === 404,
  );
});

test("the job creator can view their own job", async () => {
  const job = { jobId: "job-1", status: "queued", createdBy: "staff-1", queuedCount: 3 };
  const result = await getImportJobStatus("job-1", { sub: "staff-1", role: "staff" }, opts(job));
  assert.equal(result.status, "queued");
  assert.equal(result.queuedCount, 3);
});

test("an admin can view any job, not just their own", async () => {
  const job = { jobId: "job-2", status: "completed", createdBy: "staff-1" };
  const result = await getImportJobStatus("job-2", { sub: "admin-1", role: "admin" }, opts(job));
  assert.equal(result.status, "completed");
});

test("a staff member who didn't create the job is rejected", async () => {
  const job = { jobId: "job-3", status: "queued", createdBy: "staff-1" };
  await assert.rejects(
    () => getImportJobStatus("job-3", { sub: "staff-2", role: "staff" }, opts(job)),
    (err) => err.statusCode === 403,
  );
});

test("presigns an error report URL only when the job actually has one", async () => {
  const withReport = { jobId: "job-4", status: "queued", createdBy: "admin-1", errorReportKey: "reports/job-4-errors.json" };
  const result = await getImportJobStatus("job-4", { sub: "admin-1", role: "admin" }, opts(withReport));
  assert.ok(result.errorReportUrl?.startsWith("https://test-bucket.s3."));

  const withoutReport = { jobId: "job-5", status: "completed", createdBy: "admin-1" };
  const result2 = await getImportJobStatus("job-5", { sub: "admin-1", role: "admin" }, opts(withoutReport));
  assert.equal(result2.errorReportUrl, null);
});

test("missing counters default to sensible values instead of undefined", async () => {
  const job = { jobId: "job-6", status: "awaiting_upload", createdBy: "admin-1" };
  const result = await getImportJobStatus("job-6", { sub: "admin-1", role: "admin" }, opts(job));
  assert.equal(result.processedCount, 0);
  assert.equal(result.successCount, 0);
  assert.equal(result.totalRows, null);
});
