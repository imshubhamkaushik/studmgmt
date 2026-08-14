import { Router } from "express"; import * as c from "../controllers/academic-year.controller.js"; import { validateObjectId } from "../middleware/validate-object-id.middleware.js";
const r=Router(); r.route("/").get(c.list).post(c.create); r.patch("/:id",validateObjectId(),c.update); r.post("/:id/activate",validateObjectId(),c.setActive); export default r;
