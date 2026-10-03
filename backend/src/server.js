import "dotenv/config";
import mongoose from "mongoose";

import app from "./app.js";
import { connectDatabase } from "./config/db.js";
import { loadEnv } from "./config/env.js";
import { bootstrapAdmin } from "./services/auth.service.js";
import { failInterruptedImportJobs } from "./services/import-job.service.js";

const { port: PORT, host: HOST } = loadEnv();

let server;
let shuttingDown = false;

const shutdown = (signal) => {
  if (shuttingDown) return;

  shuttingDown = true;

  console.log(`${signal} received. Shutting down gracefully...`);

  server?.close(async () => {
    try {
      await mongoose.connection.close();

      console.log("MongoDB connection closed.");

      process.exit(0);
    } catch (error) {
      console.error("Error during graceful shutdown:", error);

      process.exit(1);
    }
  });

  setTimeout(() => {
    console.error("Forced shutdown after timeout.");

    process.exit(1);
  }, 10000).unref();
};

try {
  await connectDatabase();

  await bootstrapAdmin();

  await failInterruptedImportJobs();

  server = app.listen(PORT, HOST, () => {
    console.log(`API listening on http://${HOST}:${PORT} (reach it through the app on port 13000)`);
  });
} catch (error) {
  console.error("Failed to start the application:", error);

  process.exit(1);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
