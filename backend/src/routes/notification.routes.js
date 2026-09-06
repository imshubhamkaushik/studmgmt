import { Router } from "express";
import * as c from "../controllers/notification.controller.js";
import { authorize } from "../middleware/auth.middleware.js";
import { validateObjectId } from "../middleware/validate-object-id.middleware.js";

const router = Router();

// This router is mounted twice in app.js: behind `authenticate` at
// /api/v1/notifications for staff, and behind `authenticatePortal` at
// /api/v1/portal/notifications for students/guardians. Every handler below
// works from either req.user or req.portalUser via resolveViewer(), except
// create — authorize() rejects portal callers since they never have
// req.user set.
router.get("/me", c.listMine);
router.get("/me/unread-count", c.unreadCount);
router.patch("/:id/read", validateObjectId("id"), c.markRead);
router.patch("/read-all", c.markAllRead);
router.post("/", authorize("admin", "staff", "teacher"), c.create);

export default router;
