import type { Context } from "hono";
import { drizzle } from "drizzle-orm/d1";
import UsageEventService from "../services/usage-event.service";
import PricingService from "../services/pricing.service";
import { manageAsyncOps } from "../utils";
import { HTTP_STATUS_CODES } from "../constants";
import type { Env, ApiKeyVariables } from "../types";
import type { UsageQuery } from "../interfaces/usage-event.interface";

type TenantContext = Context<{ Bindings: Env; Variables: ApiKeyVariables }>;

class UsageEventController {
  static async ingestController(c: TenantContext) {
    const db = drizzle(c.env.DB);
    const tenantId = c.get("tenantId");
    const body = await c.req.json();
    const [error, data] = await manageAsyncOps(
      UsageEventService.ingest(db, tenantId, body),
    );
    if (error) throw error;
    c.executionCtx.waitUntil(PricingService.syncIfStale(db));
    return c.json(data, HTTP_STATUS_CODES.SUCCESS);
  }

  static async byAppController(c: TenantContext) {
    const db = drizzle(c.env.DB);
    const tenantId = c.get("tenantId");
    const [error, data] = await manageAsyncOps(
      UsageEventService.getByApp(db, tenantId, c.req.query() as UsageQuery),
    );
    if (error) throw error;
    return c.json(data, HTTP_STATUS_CODES.SUCCESS);
  }

  static async byOrgController(c: TenantContext) {
    const db = drizzle(c.env.DB);
    const tenantId = c.get("tenantId");
    const [error, data] = await manageAsyncOps(
      UsageEventService.getByOrg(db, tenantId, c.req.query() as UsageQuery),
    );
    if (error) throw error;
    return c.json(data, HTTP_STATUS_CODES.SUCCESS);
  }

  static async byUserController(c: TenantContext) {
    const db = drizzle(c.env.DB);
    const tenantId = c.get("tenantId");
    const [error, data] = await manageAsyncOps(
      UsageEventService.getByUser(db, tenantId, c.req.query() as UsageQuery),
    );
    if (error) throw error;
    return c.json(data, HTTP_STATUS_CODES.SUCCESS);
  }

  static async byProviderController(c: TenantContext) {
    const db = drizzle(c.env.DB);
    const tenantId = c.get("tenantId");
    const [error, data] = await manageAsyncOps(
      UsageEventService.getByProvider(
        db,
        tenantId,
        c.req.query() as UsageQuery,
      ),
    );
    if (error) throw error;
    return c.json(data, HTTP_STATUS_CODES.SUCCESS);
  }

  static async byModelController(c: TenantContext) {
    const db = drizzle(c.env.DB);
    const tenantId = c.get("tenantId");
    const [error, data] = await manageAsyncOps(
      UsageEventService.getByModel(db, tenantId, c.req.query() as UsageQuery),
    );
    if (error) throw error;
    return c.json(data, HTTP_STATUS_CODES.SUCCESS);
  }

  static async byActionController(c: TenantContext) {
    const db = drizzle(c.env.DB);
    const tenantId = c.get("tenantId");
    const [error, data] = await manageAsyncOps(
      UsageEventService.getByAction(db, tenantId, c.req.query() as UsageQuery),
    );
    if (error) throw error;
    return c.json(data, HTTP_STATUS_CODES.SUCCESS);
  }

  static async totalsController(c: TenantContext) {
    const db = drizzle(c.env.DB);
    const tenantId = c.get("tenantId");
    const [error, data] = await manageAsyncOps(
      UsageEventService.getTotals(db, tenantId, c.req.query() as UsageQuery),
    );
    if (error) throw error;
    return c.json(data, HTTP_STATUS_CODES.SUCCESS);
  }

  static async canaryController(c: TenantContext) {
    const db = drizzle(c.env.DB);
    const tenantId = c.get("tenantId");
    const [error, data] = await manageAsyncOps(
      UsageEventService.runCanary(db, tenantId),
    );
    if (error) throw error;
    return c.json(data, HTTP_STATUS_CODES.SUCCESS);
  }

  static async profitabilityController(c: TenantContext) {
    const db = drizzle(c.env.DB);
    const tenantId = c.get("tenantId");
    const { by, ...rest } = c.req.query() as UsageQuery & { by?: string };
    const [error, data] = await manageAsyncOps(
      UsageEventService.getProfitabilityBy(db, tenantId, by, rest as UsageQuery),
    );
    if (error) throw error;
    return c.json(data, HTTP_STATUS_CODES.SUCCESS);
  }

  static async profitabilityTotalsController(c: TenantContext) {
    const db = drizzle(c.env.DB);
    const tenantId = c.get("tenantId");
    const [error, data] = await manageAsyncOps(
      UsageEventService.getProfitabilityTotals(
        db,
        tenantId,
        c.req.query() as UsageQuery,
      ),
    );
    if (error) throw error;
    return c.json(data, HTTP_STATUS_CODES.SUCCESS);
  }
}

export default UsageEventController;
