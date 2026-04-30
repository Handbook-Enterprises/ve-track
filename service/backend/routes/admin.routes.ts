import { Hono } from "hono";
import TenantController from "../controllers/tenant.controller";
import ApiKeyController from "../controllers/api-key.controller";
import { adminApiKeyMiddleware } from "../middleware/api-key";
import type { Env } from "../types";

const adminRouter = new Hono<{ Bindings: Env }>();

adminRouter.use("/*", adminApiKeyMiddleware);

adminRouter.post("/tenants", TenantController.createController);
adminRouter.get("/tenants", TenantController.listController);
adminRouter.get("/tenants/:id", TenantController.getByIdController);
adminRouter.put("/tenants/:id", TenantController.updateController);
adminRouter.delete("/tenants/:id", TenantController.deleteController);

adminRouter.post("/tenants/:tenantId/keys", ApiKeyController.createController);
adminRouter.get("/tenants/:tenantId/keys", ApiKeyController.listController);
adminRouter.delete("/keys/:id", ApiKeyController.revokeController);

export default adminRouter;
