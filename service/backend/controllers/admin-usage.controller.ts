import type { Context } from "hono";
import { drizzle } from "drizzle-orm/d1";
import AdminUsageService from "../services/admin-usage.service";
import { manageAsyncOps } from "../utils";
import { HTTP_STATUS_CODES } from "../constants";
import type { Env } from "../types";

type AdminContext = Context<{ Bindings: Env }>;

class AdminUsageController {
  static async totalsController(c: AdminContext) {
    const db = drizzle(c.env.DB);
    const fromDays = c.req.query("fromDays");
    const [error, data] = await manageAsyncOps(
      AdminUsageService.getTotals(db, fromDays),
    );
    if (error) throw error;
    return c.json(data, HTTP_STATUS_CODES.SUCCESS);
  }

  static async byAppController(c: AdminContext) {
    const db = drizzle(c.env.DB);
    const fromDays = c.req.query("fromDays");
    const [error, data] = await manageAsyncOps(
      AdminUsageService.getByApp(db, fromDays),
    );
    if (error) throw error;
    return c.json(data, HTTP_STATUS_CODES.SUCCESS);
  }

  static async byActionController(c: AdminContext) {
    const db = drizzle(c.env.DB);
    const fromDays = c.req.query("fromDays");
    const app = c.req.query("app") || undefined;
    const [error, data] = await manageAsyncOps(
      AdminUsageService.getByAction(db, fromDays, app),
    );
    if (error) throw error;
    return c.json(data, HTTP_STATUS_CODES.SUCCESS);
  }
}

export default AdminUsageController;
