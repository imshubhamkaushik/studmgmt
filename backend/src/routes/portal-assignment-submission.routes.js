import { Router } from "express";
import * as c from "../controllers/assignment-submission.controller.js";
import { validateObjectId } from "../middleware/validate-object-id.middleware.js";
import { uploadMemory } from "../middleware/upload.middleware.js";

const router = Router();

router.post("/assignment/:assignmentId", validateObjectId("assignmentId"), uploadMemory("file"), c.submitMine);

export default router;
