import express from "express";
import cors from "cors";

import studentRoutes from "./routes/student.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";

import { notFoundHandler } from "./middleware/not-found.middleware.js";
import { errorHandler } from "./middleware/error.middleware.js";

const app = express();
app.disable("x-powered-by");

const allowedOrigins = new Set(
  (process.env.CORS_ORIGINS || "http://localhost:5173,http://127.0.0.1:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.has(origin)) {
        return callback(null, true);
      }

      return callback(null, false);
    },
  }),
);

app.use(
  express.json({
    limit: "100kb",
  }),
);

// Root/server endpoint
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Student Management API is running(/).",
  });
});

// API health check
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Student Management API is running(/api/health).",
  });
});

app.use("/api/students", studentRoutes);
app.use("/api/dashboard", dashboardRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
