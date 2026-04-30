import { Context } from "hono";
import { drizzle } from "drizzle-orm/d1";
import TenantService from "../services/tenant.service";
import { manageAsyncOps } from "../utils";
import { HTTP_STATUS_CODES } from "../constants";
import type { Env } from "../types";

type AppContext = Context<{ Bindings: Env }>;

class TenantController {
  static async createController(c: AppContext) {
    const db = drizzle(c.env.DB);
    const body = await c.req.json();
    const [error, data] = await manageAsyncOps(TenantService.create(db, body));
    if (error) throw error;
    return c.json(data, HTTP_STATUS_CODES.SUCCESS);
  }

  static async listController(c: AppContext) {
    const db = drizzle(c.env.DB);
    const [error, data] = await manageAsyncOps(TenantService.list(db));
    if (error) throw error;
    return c.json(data, HTTP_STATUS_CODES.SUCCESS);
  }

  static async getByIdController(c: AppContext) {
    const db = drizzle(c.env.DB);
    const { id } = c.req.param();
    const [error, data] = await manageAsyncOps(TenantService.getById(db, id));
    if (error) throw error;
    return c.json(data, HTTP_STATUS_CODES.SUCCESS);
  }

  static async updateController(c: AppContext) {
    const db = drizzle(c.env.DB);
    const { id } = c.req.param();
    const body = await c.req.json();
    const [error, data] = await manageAsyncOps(
      TenantService.update(db, id, body),
    );
    if (error) throw error;
    return c.json(data, HTTP_STATUS_CODES.SUCCESS);
  }

  static async deleteController(c: AppContext) {
    const db = drizzle(c.env.DB);
    const { id } = c.req.param();
    const [error, data] = await manageAsyncOps(TenantService.delete(db, id));
    if (error) throw error;
    return c.json(data, HTTP_STATUS_CODES.SUCCESS);
  }
}

export default TenantController;
