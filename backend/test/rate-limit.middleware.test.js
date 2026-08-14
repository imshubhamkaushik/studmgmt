import test from "node:test";
import assert from "node:assert/strict";
import { createRateLimiter } from "../src/middleware/rate-limit.middleware.js";

const run = async (middleware, ip = "127.0.0.99") => new Promise((resolve) => {
  const req = { ip, requestId: "req-test", socket: {} };
  const result = { statusCode: 200, body: null, headers: {} };
  const res = { setHeader: (k, v) => { result.headers[k] = v; }, status: (code) => { result.statusCode = code; return res; }, json: (body) => { result.body = body; resolve(result); } };
  middleware(req, res, () => resolve(result));
});

test("memory rate limiter allows requests until max and then rejects", async () => {
  const limiter = createRateLimiter({ windowMs: 10_000, max: 2 });
  assert.equal((await run(limiter)).statusCode, 200);
  assert.equal((await run(limiter)).statusCode, 200);
  assert.equal((await run(limiter)).statusCode, 429);
});
