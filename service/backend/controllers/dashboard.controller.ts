import type { Context } from "hono";
import { drizzle } from "drizzle-orm/d1";
import DashboardService from "../services/dashboard.service";
import { manageAsyncOps } from "../utils";
import { HTTP_STATUS_CODES } from "../constants";
import type { Env } from "../types";
import type { ClerkVariables } from "../middleware/clerk";
import type { UsageQuery } from "../interfaces/usage-event.interface";

type DashContext = Context<{ Bindings: Env; Variables: ClerkVariables }>;

class DashboardController {
  static async meController(c: DashContext) {
    const db = drizzle(c.env.DB);
    const tenantId = c.get("tenantId");
    const clerkUserId = c.get("clerkUserId");
    const clerkOrgId = c.get("clerkOrgId");

    const [error, data] = await manageAsyncOps(
      DashboardService.getMe(db, tenantId),
    );
    if (error) throw error;

    return c.json(
      { ...data, clerkUserId, clerkOrgId },
      HTTP_STATUS_CODES.SUCCESS,
    );
  }

  static async listKeysController(c: DashContext) {
    const db = drizzle(c.env.DB);
    const tenantId = c.get("tenantId");
    const [error, data] = await manageAsyncOps(
      DashboardService.listApiKeys(db, tenantId),
    );
    if (error) throw error;
    return c.json(data, HTTP_STATUS_CODES.SUCCESS);
  }

  static async createKeyController(c: DashContext) {
    const db = drizzle(c.env.DB);
    const tenantId = c.get("tenantId");
    const body = await c.req.json();
    const [error, data] = await manageAsyncOps(
      DashboardService.createApiKey(db, tenantId, body),
    );
    if (error) throw error;
    return c.json(data, HTTP_STATUS_CODES.SUCCESS);
  }

  static async revokeKeyController(c: DashContext) {
    const db = drizzle(c.env.DB);
    const id = c.req.param("id")!;
    const [error, data] = await manageAsyncOps(
      DashboardService.revokeApiKey(db, id),
    );
    if (error) throw error;
    return c.json(data, HTTP_STATUS_CODES.SUCCESS);
  }

  static async listTrackersController(c: DashContext) {
    const db = drizzle(c.env.DB);
    const tenantId = c.get("tenantId");
    const [error, data] = await manageAsyncOps(
      DashboardService.listTrackers(db, tenantId),
    );
    if (error) throw error;
    return c.json(data, HTTP_STATUS_CODES.SUCCESS);
  }

  static async createTrackerController(c: DashContext) {
    const db = drizzle(c.env.DB);
    const tenantId = c.get("tenantId");
    const body = await c.req.json();
    const [error, data] = await manageAsyncOps(
      DashboardService.createTracker(db, c.env, tenantId, body),
    );
    if (error) throw error;
    if (data?.tracker?.id) {
      c.executionCtx.waitUntil(
        DashboardService.syncTracker(db, c.env, data.tracker.id),
      );
    }
    return c.json(data, HTTP_STATUS_CODES.SUCCESS);
  }

  static async disconnectTrackerController(c: DashContext) {
    const db = drizzle(c.env.DB);
    const tenantId = c.get("tenantId");
    const id = c.req.param("id")!;
    const [error, data] = await manageAsyncOps(
      DashboardService.disconnectTracker(db, tenantId, id),
    );
    if (error) throw error;
    return c.json(data, HTTP_STATUS_CODES.SUCCESS);
  }

  static async syncTrackerController(c: DashContext) {
    const db = drizzle(c.env.DB);
    const id = c.req.param("id")!;
    const [error, data] = await manageAsyncOps(
      DashboardService.syncTracker(db, c.env, id),
    );
    if (error) throw error;
    return c.json(data, HTTP_STATUS_CODES.SUCCESS);
  }

  static async overviewController(c: DashContext) {
    const db = drizzle(c.env.DB);
    const tenantId = c.get("tenantId");
    const [error, data] = await manageAsyncOps(
      DashboardService.getOverview(db, c.env, tenantId, c.req.query() as UsageQuery),
    );
    if (error) throw error;
    return c.json(data, HTTP_STATUS_CODES.SUCCESS);
  }

  static async canaryController(c: DashContext) {
    const db = drizzle(c.env.DB);
    const tenantId = c.get("tenantId");
    const [error, data] = await manageAsyncOps(
      DashboardService.runCanary(db, tenantId),
    );
    if (error) throw error;
    return c.json(data, HTTP_STATUS_CODES.SUCCESS);
  }
}

export default DashboardController;
