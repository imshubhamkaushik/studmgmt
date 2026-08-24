import { Router } from "express";
import * as c from "../controllers/portal-auth.controller.js";
import { authenticatePortal } from "../middleware/portal-auth.middleware.js";

const r = Router();

r.post("/login", c.login);
r.post("/refresh", c.refresh);
r.post("/logout", c.logout);
r.get("/me", authenticatePortal, c.me);
r.patch("/change-password", authenticatePortal, c.changePassword);

export default r;
