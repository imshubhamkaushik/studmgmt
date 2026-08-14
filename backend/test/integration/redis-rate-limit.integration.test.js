import test, { after } from "node:test";
import assert from "node:assert/strict";
import express from "express";

import { createRateLimiter } from "../../src/middleware/rate-limit.middleware.js";

const redisUrl = process.env.REDIS_URL;
let server;
let baseUrl;

const closeServer = () => new Promise((resolve, reject) => {
  if (!server) return resolve();
  server.close((error) => (error ? reject(error) : resolve()));
});

after(closeServer);

test("Redis-backed rate limiter shares counters and enforces the configured limit", async (t) => {
  if (!redisUrl) t.skip("REDIS_URL is required for Redis integration tests.");

  const app = express();
  app.use(createRateLimiter({ windowMs: 30_000, max: 2, failClosed: true }));
  app.get("/limited", (req, res) => res.status(200).json({ success: true }));

  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;

  const first = await fetch(`${baseUrl}/limited`);
  const second = await fetch(`${baseUrl}/limited`);
  const third = await fetch(`${baseUrl}/limited`);

  assert.equal(first.status, 200);
  assert.equal(second.status, 200);
  assert.equal(third.status, 429);
  assert.equal(first.headers.get("x-ratelimit-limit"), "2");
  assert.equal(second.headers.get("x-ratelimit-remaining"), "0");
  assert.equal(third.headers.get("x-ratelimit-remaining"), "0");
});
