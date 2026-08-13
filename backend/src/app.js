import express from "express";
import cors from "cors";
import mongoose from "mongoose";

import studentRoutes from "./routes/student.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import { AppError } from "./utils/AppError.js";
import { notFoundHandler } from "./middleware/not-found.middleware.js";
import { errorHandler } from "./middleware/error.middleware.js";

const app = express();
app.disable("x-powered-by");

const allowedOrigins = new Set(
  (process.env.CORS_ORIGINS || "http://localhost:5173,http://127.0.0.1:5173")
    .split(",").map((origin) => origin.trim()).filter(Boolean),
);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.has(origin)) return callback(null, true);
    return callback(new AppError("Origin is not allowed by CORS policy.", 403));
  },
}));
app.use(express.json({ limit: "100kb" }));

app.get("/", (req, res) => res.status(200).json({ success: true, message: "Student Management API is running." }));

app.get("/api/v1/health", (req, res) => res.status(200).json({ success: true, status: "ok" }));

app.get("/api/v1/ready", (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ success: false, status: "not_ready" });
  }
  return res.status(200).json({ success: true, status: "ready" });
});

app.use("/api/v1/students", studentRoutes);
app.use("/api/v1/dashboard", dashboardRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
