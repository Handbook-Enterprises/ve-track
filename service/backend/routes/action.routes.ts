import { Hono } from "hono";
import ActionService from "../services/action.service";
import { createCrudController } from "../controllers/crud.controller";
import type { Env } from "../types";
import type { ClerkVariables } from "../middleware/clerk";

const ctrl = createCrudController(ActionService);
const actionsRouter = new Hono<{ Bindings: Env; Variables: ClerkVariables }>();

actionsRouter.get("/", ctrl.list);
actionsRouter.post("/", ctrl.create);
actionsRouter.get("/:id", ctrl.get);
actionsRouter.patch("/:id", ctrl.update);
actionsRouter.delete("/:id", ctrl.remove);

export default actionsRouter;
