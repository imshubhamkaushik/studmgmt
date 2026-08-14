import test from "node:test";
import assert from "node:assert/strict";
import { hashPassword, verifyPassword } from "../src/utils/password.js";
import { signAccessToken, verifyAccessToken } from "../src/utils/jwt.js";

test("password hashes verify without storing plaintext", () => {
  const { hash, salt } = hashPassword("very-strong-password");
  assert.equal(verifyPassword("very-strong-password", hash, salt), true);
  assert.equal(verifyPassword("wrong-password", hash, salt), false);
});

test("signed access tokens verify and expose claims", () => {
  const secret = "x".repeat(40);
  const token = signAccessToken({ sub: "abc", role: "admin" }, secret, 60);
  const payload = verifyAccessToken(token, secret);
  assert.equal(payload.sub, "abc");
  assert.equal(payload.role, "admin");
});
