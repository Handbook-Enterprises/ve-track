import { Hono } from "hono";
import UsageEventController from "../controllers/usage-event.controller";
import { apiKeyMiddleware } from "../middleware/api-key";
import type { Env, ApiKeyVariables } from "../types";

const v1Router = new Hono<{ Bindings: Env; Variables: ApiKeyVariables }>();

v1Router.use("/*", apiKeyMiddleware);

v1Router.post("/events", UsageEventController.ingestController);
v1Router.get("/usage/by-app", UsageEventController.byAppController);
v1Router.get("/usage/by-org", UsageEventController.byOrgController);
v1Router.get("/usage/by-user", UsageEventController.byUserController);
v1Router.get("/usage/by-provider", UsageEventController.byProviderController);
v1Router.get("/usage/by-model", UsageEventController.byModelController);
v1Router.get("/usage/totals", UsageEventController.totalsController);
v1Router.post("/canary", UsageEventController.canaryController);

export default v1Router;
