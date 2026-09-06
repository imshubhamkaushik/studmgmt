import { Router } from "express";
import * as c from "../controllers/assignment-submission.controller.js";

const router = Router();

router.post("/assignment/:assignmentId/upload-url", c.getMyUploadUrl);

export default router;
