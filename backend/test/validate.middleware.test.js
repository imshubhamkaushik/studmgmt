import test from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { validate } from "../src/middleware/validate.middleware.js";

function mockRes() {
  return { statusCode: null, body: null, status(c) { this.statusCode = c; return this; }, json(b) { this.body = b; return this; } };
}

test("validate() passes through and normalizes a valid body", () => {
  const schema = z.object({ name: z.string(), age: z.coerce.number() });
  const middleware = validate({ body: schema });
  const req = { body: { name: "Ada", age: "30" } };
  let nextCalled = false;
  middleware(req, mockRes(), () => { nextCalled = true; });
  assert.equal(nextCalled, true);
  assert.deepEqual(req.body, { name: "Ada", age: 30 });
});

test("validate() calls next with a 400 AppError carrying field-level details on invalid body", () => {
  const schema = z.object({ name: z.string().min(1, "name is required.") });
  const middleware = validate({ body: schema });
  const req = { body: {} };
  let caughtError = null;
  middleware(req, mockRes(), (err) => { caughtError = err; });
  assert.ok(caughtError);
  assert.equal(caughtError.statusCode, 400);
  assert.equal(caughtError.message, "Validation failed.");
  assert.ok(caughtError.details.some((d) => d.includes("name")));
});

test("validate() rejects an invalid ObjectId-shaped field with a clear message", () => {
  const schema = z.object({ studentId: z.string().refine(() => false, { message: "must be a valid ID." }) });
  const middleware = validate({ body: schema });
  const req = { body: { studentId: "not-an-id" } };
  let caughtError = null;
  middleware(req, mockRes(), (err) => { caughtError = err; });
  assert.equal(caughtError.statusCode, 400);
  assert.deepEqual(caughtError.details, ["studentId: must be a valid ID."]);
});

test("validate() validates query params independently of body", () => {
  const schema = z.object({ studentId: z.string().min(1) });
  const middleware = validate({ query: schema });
  const req = { query: {} };
  let caughtError = null;
  middleware(req, mockRes(), (err) => { caughtError = err; });
  assert.equal(caughtError.statusCode, 400);
});

test("validate() with no schemas configured always calls next() with no error", () => {
  const middleware = validate({});
  const req = { body: { anything: true } };
  let nextCalled = false;
  middleware(req, mockRes(), (err) => { assert.equal(err, undefined); nextCalled = true; });
  assert.equal(nextCalled, true);
});
