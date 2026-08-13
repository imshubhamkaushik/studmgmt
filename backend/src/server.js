import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

import app from "./app.js";
import { connectDatabase } from "./config/db.js";
import { loadEnv } from "./config/env.js";

const { port: PORT } = loadEnv();

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

const startServer = async () => {
  try {
    await connectDatabase();

    server = app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start the application:", error);

    process.exit(1);
  }
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

startServer();
