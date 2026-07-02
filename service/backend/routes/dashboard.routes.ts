import { Hono } from "hono";
import DashboardController from "../controllers/dashboard.controller";
import appsRouter from "./app.routes";
import actionsRouter from "./action.routes";
import peopleRouter from "./person.routes";
import organizationsRouter from "./organization.routes";
import modelsRouter from "./model.routes";
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
dashboardRouter.get("/trackers", DashboardController.listTrackersController);
dashboardRouter.post("/trackers", DashboardController.createTrackerController);
dashboardRouter.delete("/trackers/:id", DashboardController.disconnectTrackerController);
dashboardRouter.post("/trackers/:id/sync", DashboardController.syncTrackerController);
dashboardRouter.get("/trackers/:id/costs", DashboardController.trackerCostsController);
dashboardRouter.patch("/trackers/:id", DashboardController.updateTrackerController);
dashboardRouter.get("/overview", DashboardController.overviewController);
dashboardRouter.get("/credits", DashboardController.creditsController);
dashboardRouter.get("/credits/detail", DashboardController.creditsDetailController);
dashboardRouter.post("/canary", DashboardController.canaryController);
dashboardRouter.get("/settings", DashboardController.settingsController);
dashboardRouter.patch("/settings", DashboardController.updateSettingsController);

dashboardRouter.route("/apps", appsRouter);
dashboardRouter.route("/actions", actionsRouter);
dashboardRouter.route("/people", peopleRouter);
dashboardRouter.route("/organizations", organizationsRouter);
dashboardRouter.route("/models", modelsRouter);

export default dashboardRouter;
