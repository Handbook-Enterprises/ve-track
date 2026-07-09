import { Hono } from "hono";
import { drizzle } from "drizzle-orm/d1";
import ActionService from "../services/action.service";
import { createCrudController } from "../controllers/crud.controller";
import { manageAsyncOps } from "../utils";
import { HTTP_STATUS_CODES } from "../constants";
import type { Env } from "../types";
import type { ClerkVariables } from "../middleware/clerk";

const ctrl = createCrudController(ActionService);
const actionsRouter = new Hono<{ Bindings: Env; Variables: ClerkVariables }>();

actionsRouter.get("/", ctrl.list);
actionsRouter.post("/", ctrl.create);
actionsRouter.patch("/rename", async (c) => {
  const db = drizzle(c.env.DB);
  const body = await c.req.json();
  const [error, data] = await manageAsyncOps(
    ActionService.rename(db, c.get("tenantId"), body),
  );
  if (error) throw error;
  return c.json(data, HTTP_STATUS_CODES.SUCCESS);
});
actionsRouter.post("/merge", async (c) => {
  const db = drizzle(c.env.DB);
  const body = await c.req.json();
  const [error, data] = await manageAsyncOps(
    ActionService.merge(db, c.get("tenantId"), body),
  );
  if (error) throw error;
  return c.json(data, HTTP_STATUS_CODES.SUCCESS);
});
actionsRouter.get("/:id", ctrl.get);
actionsRouter.patch("/:id", ctrl.update);
actionsRouter.delete("/:id", ctrl.remove);

export default actionsRouter;
