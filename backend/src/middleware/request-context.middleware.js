import crypto from "node:crypto";
import { requestStore } from "../utils/request-store.js";

const getLogLevel = (statusCode) => {
  if (statusCode >= 500) return "error";
  if (statusCode >= 400) return "warn";

  return "info";
};

export const requestContext = (req, res, next) => {
  const requestId = req.get("x-request-id") || crypto.randomUUID();

  req.requestId = requestId;
  res.setHeader("X-Request-Id", requestId);

  const startedAt = Date.now();

  res.on("finish", () => {
    const level = getLogLevel(res.statusCode);

    console.log(
      JSON.stringify({
        level,
        requestId,
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        durationMs: Date.now() - startedAt,
        actorId: req.user?.sub || null,
        actorEmail: req.user?.email || null,
      }),
    );
  });

  requestStore.run({ requestId, actor: null }, next);
};
