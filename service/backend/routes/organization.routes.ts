import { Hono } from "hono";
import OrganizationService from "../services/organization.service";
import { createCrudController } from "../controllers/crud.controller";
import type { Env } from "../types";
import type { ClerkVariables } from "../middleware/clerk";

const ctrl = createCrudController(OrganizationService);
const organizationsRouter = new Hono<{
  Bindings: Env;
  Variables: ClerkVariables;
}>();

organizationsRouter.get("/", ctrl.list);
organizationsRouter.post("/", ctrl.create);
organizationsRouter.get("/:id", ctrl.get);
organizationsRouter.patch("/:id", ctrl.update);
organizationsRouter.delete("/:id", ctrl.remove);

export default organizationsRouter;
