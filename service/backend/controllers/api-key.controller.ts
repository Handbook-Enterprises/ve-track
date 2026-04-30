import { Context } from "hono";
import { drizzle } from "drizzle-orm/d1";
import ApiKeyService from "../services/api-key.service";
import { manageAsyncOps } from "../utils";
import { HTTP_STATUS_CODES } from "../constants";
import type { Env } from "../types";

type AppContext = Context<{ Bindings: Env }>;

class ApiKeyController {
  static async createController(c: AppContext) {
    const db = drizzle(c.env.DB);
    const tenantId = c.req.param("tenantId");
    const body = await c.req.json();
    const [error, data] = await manageAsyncOps(
      ApiKeyService.create(db, tenantId, body),
    );
    if (error) throw error;
    return c.json(data, HTTP_STATUS_CODES.SUCCESS);
  }

  static async listController(c: AppContext) {
    const db = drizzle(c.env.DB);
    const tenantId = c.req.param("tenantId");
    const [error, data] = await manageAsyncOps(
      ApiKeyService.listForTenant(db, tenantId),
    );
    if (error) throw error;
    return c.json(data, HTTP_STATUS_CODES.SUCCESS);
  }

  static async revokeController(c: AppContext) {
    const db = drizzle(c.env.DB);
    const id = c.req.param("id");
    const [error, data] = await manageAsyncOps(ApiKeyService.revoke(db, id));
    if (error) throw error;
    return c.json(data, HTTP_STATUS_CODES.SUCCESS);
  }
}

export default ApiKeyController;
