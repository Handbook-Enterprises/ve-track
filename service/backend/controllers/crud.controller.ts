import type { Context } from "hono";
import { drizzle } from "drizzle-orm/d1";
import { manageAsyncOps } from "../utils";
import { HTTP_STATUS_CODES } from "../constants";
import type { Env } from "../types";
import type { ClerkVariables } from "../middleware/clerk";

type Ctx = Context<{ Bindings: Env; Variables: ClerkVariables }>;

export interface CrudService {
  listForTenant(db: any, tenantId: string): Promise<any>;
  create(db: any, tenantId: string, body: any): Promise<any>;
  getById(db: any, tenantId: string, id: string): Promise<any>;
  update(db: any, tenantId: string, id: string, body: any): Promise<any>;
  remove(db: any, tenantId: string, id: string): Promise<any>;
}

export const createCrudController = (service: CrudService) => ({
  list: async (c: Ctx) => {
    const db = drizzle(c.env.DB);
    const [error, data] = await manageAsyncOps(
      service.listForTenant(db, c.get("tenantId")),
    );
    if (error) throw error;
    return c.json(data, HTTP_STATUS_CODES.SUCCESS);
  },
  create: async (c: Ctx) => {
    const db = drizzle(c.env.DB);
    const body = await c.req.json();
    const [error, data] = await manageAsyncOps(
      service.create(db, c.get("tenantId"), body),
    );
    if (error) throw error;
    return c.json(data, HTTP_STATUS_CODES.SUCCESS);
  },
  get: async (c: Ctx) => {
    const db = drizzle(c.env.DB);
    const [error, data] = await manageAsyncOps(
      service.getById(db, c.get("tenantId"), c.req.param("id")!),
    );
    if (error) throw error;
    return c.json(data, HTTP_STATUS_CODES.SUCCESS);
  },
  update: async (c: Ctx) => {
    const db = drizzle(c.env.DB);
    const body = await c.req.json();
    const [error, data] = await manageAsyncOps(
      service.update(db, c.get("tenantId"), c.req.param("id")!, body),
    );
    if (error) throw error;
    return c.json(data, HTTP_STATUS_CODES.SUCCESS);
  },
  remove: async (c: Ctx) => {
    const db = drizzle(c.env.DB);
    const [error, data] = await manageAsyncOps(
      service.remove(db, c.get("tenantId"), c.req.param("id")!),
    );
    if (error) throw error;
    return c.json(data, HTTP_STATUS_CODES.SUCCESS);
  },
});
