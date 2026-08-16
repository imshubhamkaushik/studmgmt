import express from "express";
import cors from "cors";
import mongoose from "mongoose";

import studentRoutes from "./routes/student.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import auditRoutes from "./routes/audit.routes.js";
import academicYearRoutes from "./routes/academic-year.routes.js";
import classroomRoutes from "./routes/classroom.routes.js";
import attendanceRoutes from "./routes/attendance.routes.js";
import enrollmentRoutes from "./routes/enrollment.routes.js";
import authRoutes from "./routes/auth.routes.js";
import teacherClassroomAssignmentRoutes from "./routes/teacher-classroom-assignment.routes.js";
import { authenticate, authorize } from "./middleware/auth.middleware.js";
import { AppError } from "./utils/AppError.js";
import { notFoundHandler } from "./middleware/not-found.middleware.js";
import { errorHandler } from "./middleware/error.middleware.js";
import { requestContext } from "./middleware/request-context.middleware.js";
import { securityHeaders } from "./middleware/security-headers.middleware.js";
import { createRateLimiter } from "./middleware/rate-limit.middleware.js";
import openApiDocument from "../docs/openapi.json" with { type: "json" };

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(requestContext);
app.use(securityHeaders);
app.use(
  createRateLimiter({
    windowMs: 60_000,
    max: Number(process.env.RATE_LIMIT_MAX || 120),
  }),
);

const allowedOrigins = new Set(
  (process.env.CORS_ORIGINS || "http://localhost:5173,http://127.0.0.1:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.has(origin)) return callback(null, true);
      return callback(
        new AppError("Origin is not allowed by CORS policy.", 403),
      );
    },
    // Required for HttpOnly refresh-token cookies when the SPA and API use
    // different origins (for example localhost:5173/8080 -> localhost:5000).
    credentials: true,
  }),
);
app.use(express.json({ limit: "100kb" }));
app.use((req, res, next) => {
  const header = req.headers.cookie;
  req.cookies = {};
  if (header) {
    for (const pair of header.split(";")) {
      const index = pair.indexOf("=");
      if (index <= 0) continue;
      const key = pair.slice(0, index).trim();
      const value = pair.slice(index + 1).trim();
      try {
        req.cookies[key] = decodeURIComponent(value);
      } catch {
        req.cookies[key] = value;
      }
    }
  }
  next();
});

app.get("/", (req, res) =>
  res
    .status(200)
    .json({ success: true, message: "Student Management API is running." }),
);
app.get("/api/v1/openapi.json", (req, res) =>
  res.status(200).json(openApiDocument),
);
app.get("/api/v1/health", (req, res) =>
  res.status(200).json({ success: true, status: "ok" }),
);
app.get("/api/v1/ready", (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ success: false, status: "not_ready" });
  }
  return res.status(200).json({ success: true, status: "ready" });
});

app.use("/api/v1/auth", authRoutes);

// All business APIs require authentication. Authorization is enforced by route modules.
app.use("/api/v1/students", authenticate, studentRoutes);
app.use("/api/v1/dashboard", authenticate, dashboardRoutes);
app.use("/api/v1/audit", authenticate, auditRoutes);
app.use(
  "/api/v1/academic-years",
  authenticate,
  authorize("admin"),
  academicYearRoutes,
);
app.use(
  "/api/v1/classrooms",
  authenticate,
  authorize("admin"),
  classroomRoutes,
);
app.use("/api/v1/attendance", authenticate, attendanceRoutes);
app.use("/api/v1/enrollments", authenticate, enrollmentRoutes);
app.use(
  "/api/v1/teacher-classroom-assignments",
  authenticate,
  teacherClassroomAssignmentRoutes,
);
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
