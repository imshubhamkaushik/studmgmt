import test from "node:test";
import assert from "node:assert/strict";
import { processSubmissionMessage } from "../src/workers/submission-consumer.js";

function fakeSubmission({ dueDate = new Date("2099-01-01") } = {}) {
  const saved = [];
  return {
    student: "student-1",
    file: { sizeBytes: null, mimeType: "application/octet-stream" },
    assignment: { teacher: "teacher-1", title: "Essay", dueDate },
    status: "pending_upload",
    rejectionReason: null,
    save: async function () {
      saved.push({ status: this.status, rejectionReason: this.rejectionReason, file: { ...this.file } });
    },
    _saved: saved,
  };
}

function message(body) {
  return { Body: JSON.stringify(body) };
}

test("a valid result marks the submission submitted and notifies the teacher", async () => {
  const submission = fakeSubmission();
  const notifyCalls = [];

  const result = await processSubmissionMessage(
    message({ submissionId: "sub-1", valid: true, sizeBytes: 4096, mimeType: "application/pdf" }),
    {
      findSubmission: async () => submission,
      findStudentName: async () => "Ada Lovelace",
      notifyUserFn: async (userId, payload) => {
        notifyCalls.push({ userId, payload });
      },
    },
  );

  assert.equal(result.accepted, true);
  assert.equal(submission.status, "submitted");
  assert.equal(submission.file.sizeBytes, 4096);
  assert.equal(submission.file.mimeType, "application/pdf");
  assert.equal(notifyCalls.length, 1);
  assert.equal(notifyCalls[0].userId, "teacher-1");
  assert.match(notifyCalls[0].payload.body, /Ada Lovelace/);
  assert.match(notifyCalls[0].payload.body, /Essay/);
});

test("a submission past the due date is marked late, not submitted", async () => {
  const submission = fakeSubmission({ dueDate: new Date("2020-01-01") }); // long past

  const result = await processSubmissionMessage(
    message({ submissionId: "sub-2", valid: true, sizeBytes: 100, mimeType: "application/pdf" }),
    {
      findSubmission: async () => submission,
      findStudentName: async () => "Late Student",
      notifyUserFn: async () => {},
    },
  );

  assert.equal(result.isLate, true);
  assert.equal(submission.status, "late");
});

test("an invalid result marks the submission rejected with the reason, and does not notify", async () => {
  const submission = fakeSubmission();
  const notifyCalls = [];

  const result = await processSubmissionMessage(
    message({ submissionId: "sub-3", valid: false, reason: "File type not allowed." }),
    {
      findSubmission: async () => submission,
      findStudentName: async () => "Rejected Student",
      notifyUserFn: async (...args) => notifyCalls.push(args),
    },
  );

  assert.equal(result.accepted, false);
  assert.equal(submission.status, "rejected");
  assert.equal(submission.rejectionReason, "File type not allowed.");
  assert.equal(notifyCalls.length, 0, "a rejected submission shouldn't notify the teacher");
});

test("a message for a submission that no longer exists is handled without throwing", async () => {
  const result = await processSubmissionMessage(message({ submissionId: "missing", valid: true }), {
    findSubmission: async () => null,
    findStudentName: async () => "irrelevant",
    notifyUserFn: async () => {
      throw new Error("should never be called");
    },
  });

  assert.equal(result.found, false);
});

test("a notification failure doesn't undo the submission that was already saved", async () => {
  const submission = fakeSubmission();

  const result = await processSubmissionMessage(
    message({ submissionId: "sub-4", valid: true, sizeBytes: 10, mimeType: "image/png" }),
    {
      findSubmission: async () => submission,
      findStudentName: async () => "Resilient Student",
      notifyUserFn: async () => {
        throw new Error("SNS is down");
      },
    },
  );

  assert.equal(result.accepted, true);
  assert.equal(submission.status, "submitted");
  assert.equal(submission._saved.length, 1, "the save should have happened before the notification attempt");
});
