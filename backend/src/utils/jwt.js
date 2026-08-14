import crypto from "node:crypto";

function base64url(value) {
  return Buffer.from(value).toString("base64url");
}

function decode(value) {
  return JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
}

function signature(input, secret) {
  return crypto.createHmac("sha256", secret).update(input).digest("base64url");
}

export function signAccessToken(payload, secret, expiresInSeconds = 900) {
  const now = Math.floor(Date.now() / 1000);
  
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  
  const body = base64url(
    JSON.stringify({ ...payload, iat: now, exp: now + expiresInSeconds }),
  );
  
  const input = `${header}.${body}`;
  
  return `${input}.${signature(input, secret)}`;
}

export function verifyAccessToken(token, secret) {
  const [header, body, sig] = String(token || "").split(".");
  
  if (!header || !body || !sig) throw new Error("Malformed token.");
  
  const input = `${header}.${body}`;
  
  const expected = signature(input, secret);
  
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected)))
    throw new Error("Invalid token.");
  
  const payload = decode(body);
  
  if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000))
    throw new Error("Token expired.");
  
  return payload;
}
