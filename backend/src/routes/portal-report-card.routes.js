import { Router } from "express";
import * as c from "../controllers/report-card.controller.js";

const router = Router();

router.get("/", c.getMyReportCard);

export default router;
