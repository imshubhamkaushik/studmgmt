import express from "express";
import cors from "cors";

import studentRoutes from "./routes/student.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";

import { notFoundHandler } from "./middleware/not-found.middleware.js";
import { errorHandler } from "./middleware/error.middleware.js";

const app = express();

app.use(
  cors({
    origin: true,
  }),
);

app.use(
  express.json({
    limit: "100kb",
  }),
);

app.get("/api/v1/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Student Management API is running.",
  });
});

app.use("/api/v1/students", studentRoutes);

app.use("/api/v1/dashboard", dashboardRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
