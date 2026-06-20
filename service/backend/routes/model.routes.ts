import { Hono } from "hono";
import ModelService from "../services/model.service";
import { createCrudController } from "../controllers/crud.controller";
import type { Env } from "../types";
import type { ClerkVariables } from "../middleware/clerk";

const ctrl = createCrudController(ModelService);
const modelsRouter = new Hono<{ Bindings: Env; Variables: ClerkVariables }>();

modelsRouter.get("/", ctrl.list);
modelsRouter.post("/", ctrl.create);
modelsRouter.get("/:id", ctrl.get);
modelsRouter.patch("/:id", ctrl.update);
modelsRouter.delete("/:id", ctrl.remove);

export default modelsRouter;
