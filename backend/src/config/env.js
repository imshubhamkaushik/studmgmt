const required = ["MONGODB_URI", "JWT_SECRET"];

export const loadEnv = () => {
  const missing = required.filter((key) => !process.env[key]?.trim());
  if (missing.length) {
    throw new Error(`Missing required environment variable(s): ${missing.join(", ")}`);
  }

  const jwtSecret = process.env.JWT_SECRET?.trim() || "";
  if (jwtSecret.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters.");
  }

  const port = Number(process.env.PORT || 5000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be an integer between 1 and 65535.");
  }

  // Loopback by default: the API is only reachable through the app on port
  // 13000 (dev server / nginx). Containers set HOST=0.0.0.0 so nginx can reach it.
  const host = process.env.HOST?.trim() || "127.0.0.1";

  return { port, host };
};
