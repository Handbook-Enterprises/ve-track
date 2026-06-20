import { Hono } from "hono";
import AppService from "../services/app.service";
import { createCrudController } from "../controllers/crud.controller";
import type { Env } from "../types";
import type { ClerkVariables } from "../middleware/clerk";

const ctrl = createCrudController(AppService);
const appsRouter = new Hono<{ Bindings: Env; Variables: ClerkVariables }>();

appsRouter.get("/", ctrl.list);
appsRouter.post("/", ctrl.create);
appsRouter.get("/:id", ctrl.get);
appsRouter.patch("/:id", ctrl.update);
appsRouter.delete("/:id", ctrl.remove);

export default appsRouter;
