import { Router } from "express";
import * as c from "../controllers/auth.controller.js";
import { authenticate, authorize } from "../middleware/auth.middleware.js";
import { validateObjectId } from "../middleware/validate-object-id.middleware.js";

const r = Router();
r.post("/login", c.login);
r.post("/refresh", c.refresh);
r.post("/logout", c.logout);
r.get("/me", authenticate, c.me);
r.get("/users", authenticate, authorize("admin"), c.listUsers);
r.post("/users", authenticate, authorize("admin"), c.createUser);
r.patch(
  "/users/:id",
  authenticate,
  authorize("admin"),
  validateObjectId(),
  c.updateUser,
);

export default r;
