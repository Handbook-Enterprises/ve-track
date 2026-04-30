import { Hono } from "hono";
import DashboardController from "../controllers/dashboard.controller";
import { clerkAuthMiddleware } from "../middleware/clerk";
import type { ClerkVariables } from "../middleware/clerk";
import type { Env } from "../types";

const dashboardRouter = new Hono<{
  Bindings: Env;
  Variables: ClerkVariables;
}>();

dashboardRouter.use("/*", clerkAuthMiddleware);

dashboardRouter.get("/me", DashboardController.meController);
dashboardRouter.get("/keys", DashboardController.listKeysController);
dashboardRouter.post("/keys", DashboardController.createKeyController);
dashboardRouter.delete("/keys/:id", DashboardController.revokeKeyController);
dashboardRouter.get("/overview", DashboardController.overviewController);
dashboardRouter.post("/canary", DashboardController.canaryController);

export default dashboardRouter;
