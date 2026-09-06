import test from "node:test";
import assert from "node:assert/strict";
import { formatBatchAsNdjson, flushBatch } from "../src/workers/audit-archive-worker.js";

test("formats each event as its own line of valid JSON", () => {
  const events = [
    { entityType: "student", action: "CREATE" },
    { entityType: "attendance", action: "BULK_MARK" },
  ];
  const ndjson = formatBatchAsNdjson(events);
  const lines = ndjson.trim().split("\n");

  assert.equal(lines.length, 2);
  assert.deepEqual(JSON.parse(lines[0]), events[0]);
  assert.deepEqual(JSON.parse(lines[1]), events[1]);
});

test("ends with a trailing newline, the standard NDJSON convention", () => {
  const ndjson = formatBatchAsNdjson([{ a: 1 }]);
  assert.ok(ndjson.endsWith("\n"));
});

test("flushBatch does nothing and reports flushed:false for an empty batch", async () => {
  let called = false;
  const s3Client = { send: async () => { called = true; return {}; } };

  const result = await flushBatch([], { s3Client, bucket: "test-bucket" });

  assert.equal(result.flushed, false);
  assert.equal(called, false, "should never call S3 for an empty batch");
});

test("flushBatch writes one object to S3 containing every event, keyed by date", async () => {
  const calls = [];
  const s3Client = { send: async (command) => { calls.push(command); return {}; } };

  const events = [{ entityType: "student", action: "CREATE" }, { entityType: "student", action: "UPDATE" }];
  const result = await flushBatch(events, { s3Client, bucket: "test-bucket" });

  assert.equal(result.flushed, true);
  assert.equal(result.count, 2);
  assert.equal(calls.length, 1, "one PutObject per batch, not one per event");
  assert.equal(calls[0].input.Bucket, "test-bucket");
  assert.match(calls[0].input.Key, /^audit-archive\/\d{4}\/\d{2}\/\d{2}\//);
  assert.equal(calls[0].input.ContentType, "application/x-ndjson");

  const writtenLines = calls[0].input.Body.trim().split("\n");
  assert.equal(writtenLines.length, 2);
});
