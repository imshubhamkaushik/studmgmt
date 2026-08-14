import crypto from "node:crypto";

export const createRefreshToken = () =>
  crypto.randomBytes(48).toString("base64url");

export const hashRefreshToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");
