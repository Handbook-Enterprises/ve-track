import { Context } from "hono";
import { drizzle } from "drizzle-orm/d1";
import UsageEventService from "../services/usage-event.service";
import { manageAsyncOps } from "../utils";
import { HTTP_STATUS_CODES } from "../constants";
import type { Env } from "../types";
import type { UsageQuery } from "../interfaces/usage-event.interface";

type AppContext = Context<{ Bindings: Env }>;

class UsageEventController {
  static async getByAppController(c: AppContext) {
    const db = drizzle(c.env.DB);
    const query = c.req.query() as UsageQuery;

    const [error, data] = await manageAsyncOps(
      UsageEventService.getByApp(db, query),
    );
    if (error) throw error;
    return c.json(data, HTTP_STATUS_CODES.SUCCESS);
  }

  static async getByOrgController(c: AppContext) {
    const db = drizzle(c.env.DB);
    const query = c.req.query() as UsageQuery;

    const [error, data] = await manageAsyncOps(
      UsageEventService.getByOrg(db, query),
    );
    if (error) throw error;
    return c.json(data, HTTP_STATUS_CODES.SUCCESS);
  }

  static async getByUserController(c: AppContext) {
    const db = drizzle(c.env.DB);
    const query = c.req.query() as UsageQuery;

    const [error, data] = await manageAsyncOps(
      UsageEventService.getByUser(db, query),
    );
    if (error) throw error;
    return c.json(data, HTTP_STATUS_CODES.SUCCESS);
  }

  static async getByProviderController(c: AppContext) {
    const db = drizzle(c.env.DB);
    const query = c.req.query() as UsageQuery;

    const [error, data] = await manageAsyncOps(
      UsageEventService.getByProvider(db, query),
    );
    if (error) throw error;
    return c.json(data, HTTP_STATUS_CODES.SUCCESS);
  }

  static async getTotalsController(c: AppContext) {
    const db = drizzle(c.env.DB);
    const query = c.req.query() as UsageQuery;

    const [error, data] = await manageAsyncOps(
      UsageEventService.getTotals(db, query),
    );
    if (error) throw error;
    return c.json(data, HTTP_STATUS_CODES.SUCCESS);
  }

  static async syncController(c: AppContext) {
    const db = drizzle(c.env.DB);

    const [error, data] = await manageAsyncOps(
      UsageEventService.syncFromAnalyticsEngine(c.env, db),
    );
    if (error) throw error;
    return c.json(data, HTTP_STATUS_CODES.SUCCESS);
  }

  static async canaryController(c: AppContext) {
    const db = drizzle(c.env.DB);

    const [error, data] = await manageAsyncOps(
      UsageEventService.runCanary(c.env, db),
    );
    if (error) throw error;
    return c.json(data, HTTP_STATUS_CODES.SUCCESS);
  }
}

export default UsageEventController;
