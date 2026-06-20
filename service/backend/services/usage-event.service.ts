import { DrizzleD1Database } from "drizzle-orm/d1";
import { UsageEventRepository } from "../repositories/usage-event.repository";
import PricingService, { REPRICE_PROVIDERS } from "./pricing.service";
import { UsageEventMessages } from "../messages/usage-event.messages";
import { CustomError } from "../utils";
import { HTTP_STATUS_CODES } from "../constants";
import type {
  IngestBody,
  ProfitabilityGroup,
  ProfitabilityTotals,
  UsageEventInput,
  UsageGroup,
  UsageQuery,
  UsageSeriesPoint,
  UsageTotals,
} from "../interfaces/usage-event.interface";

type ProfitabilityDimension =
  | "app"
  | "action"
  | "clerk_org_id"
  | "clerk_user_id"
  | "provider";

const PROFITABILITY_DIM_MAP: Record<string, ProfitabilityDimension> = {
  app: "app",
  action: "action",
  org: "clerk_org_id",
  clerk_org_id: "clerk_org_id",
  user: "clerk_user_id",
  clerk_user_id: "clerk_user_id",
  provider: "provider",
};

const resolveProfitabilityDim = (raw?: string): ProfitabilityDimension => {
  if (!raw) return "action";
  return PROFITABILITY_DIM_MAP[raw] ?? "action";
};

const computeMargin = (revenue: number, cost: number) => {
  const margin_usd = revenue - cost;
  const margin_pct = revenue > 0 ? (margin_usd / revenue) * 100 : null;
  return { margin_usd, margin_pct };
};

const DEFAULT_FROM_DAYS = 7;
const DAY_MS = 86_400_000;

const parseFromDays = (raw?: string): number => {
  const parsed = parseInt(raw ?? `${DEFAULT_FROM_DAYS}`, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_FROM_DAYS;
  return Math.min(parsed, 365);
};

interface UsageWindow {
  fromTs: number;
  toTs?: number;
  fromDays: number;
}

const resolveWindow = (query: UsageQuery): UsageWindow => {
  const from = query.from != null ? parseInt(query.from, 10) : NaN;
  const to = query.to != null ? parseInt(query.to, 10) : NaN;
  if (Number.isFinite(from) && Number.isFinite(to) && to > from) {
    const fromDays = Math.max(1, Math.round((to - from) / DAY_MS));
    return { fromTs: from, toTs: to, fromDays };
  }
  const fromDays = parseFromDays(query.fromDays);
  return { fromTs: UsageEventRepository.fromDaysToTs(fromDays), fromDays };
};

const baseFilters = (
  tenantId: string,
  query: UsageQuery,
  window: UsageWindow,
) => ({
  tenant_id: tenantId,
  fromTs: window.fromTs,
  toTs: window.toTs,
  app: query.app || undefined,
  provider: query.provider || undefined,
  clerk_org_id: query.clerk_org_id || undefined,
  clerk_user_id: query.clerk_user_id || undefined,
  action: query.action || undefined,
  correlation_id: query.correlation_id || undefined,
});

const validateEvent = (e: UsageEventInput) => {
  if (!e || typeof e !== "object") return false;
  if (typeof e.id !== "string" || !e.id) return false;
  if (typeof e.timestamp !== "number" || !Number.isFinite(e.timestamp))
    return false;
  if (typeof e.provider !== "string" || !e.provider) return false;
  return true;
};

class UsageEventService {
  static async ingest(
    db: DrizzleD1Database,
    tenantId: string,
    body: IngestBody,
  ) {
    if (!body || typeof body.app !== "string" || !Array.isArray(body.events)) {
      throw new CustomError(
        UsageEventMessages.INGEST_VALIDATION_ERROR,
        HTTP_STATUS_CODES.BAD_REQUEST,
      );
    }

    const valid = body.events.filter(validateEvent);
    console.log("[ve-track][ingest-svc] valid events", { received: body.events.length, valid: valid.length });

    const index = await PricingService.getIndex(db);

    const rows = valid.map((e) => {
      const cachedInput = e.cached_input_tokens ?? 0;
      const cacheWrite = e.cache_write_tokens ?? 0;
      let cost_usd = e.cost_usd ?? null;
      let cost_source = "provider_response";
      let cost_confidence = cost_usd != null ? "high" : "unknown";

      if (REPRICE_PROVIDERS.has(e.provider)) {
        const priced = PricingService.price(index, e.provider, e.model ?? null, {
          prompt: e.prompt_tokens ?? 0,
          cached: cachedInput,
          cacheWrite,
          completion: e.completion_tokens ?? 0,
        });
        if (priced.matched) {
          cost_usd = priced.costUsd;
          cost_source = "catalog";
          cost_confidence = "high";
        } else {
          cost_source = "estimate";
          cost_confidence = "unknown";
        }
      }

      return {
        id: e.id,
        tenant_id: tenantId,
        timestamp: e.timestamp,
        app: body.app,
        clerk_user_id: e.clerk_user_id ?? null,
        clerk_org_id: e.clerk_org_id ?? null,
        action: e.action ?? null,
        provider: e.provider,
        model: e.model ?? null,
        prompt_tokens: e.prompt_tokens ?? null,
        completion_tokens: e.completion_tokens ?? null,
        cached_input_tokens: e.cached_input_tokens ?? null,
        cache_write_tokens: e.cache_write_tokens ?? null,
        reasoning_tokens: e.reasoning_tokens ?? null,
        latency_ms: e.latency_ms ?? null,
        cost_usd,
        cost_source,
        cost_confidence,
        status_code: e.status_code ?? null,
        credits_charged: e.credits_charged ?? null,
        credit_price_usd_at_event: e.credit_price_usd_at_event ?? null,
        correlation_id: e.correlation_id ?? null,
      };
    });

    const inserted = await UsageEventRepository.insertMany(db, rows);
    return {
      success: true,
      message: UsageEventMessages.INGEST_SUCCESS,
      received: body.events.length,
      accepted: inserted,
    };
  }

  static async getByApp(
    db: DrizzleD1Database,
    tenantId: string,
    query: UsageQuery,
  ) {
    const window = resolveWindow(query);
    const groups = await UsageEventRepository.groupBy(
      db,
      "app",
      baseFilters(tenantId, query, window),
    );
    return this.respond(groups, window.fromDays);
  }

  static async getByOrg(
    db: DrizzleD1Database,
    tenantId: string,
    query: UsageQuery,
  ) {
    const window = resolveWindow(query);
    const groups = await UsageEventRepository.groupBy(
      db,
      "clerk_org_id",
      baseFilters(tenantId, query, window),
    );
    return this.respond(groups, window.fromDays);
  }

  static async getByUser(
    db: DrizzleD1Database,
    tenantId: string,
    query: UsageQuery,
  ) {
    const window = resolveWindow(query);
    const groups = await UsageEventRepository.groupBy(
      db,
      "clerk_user_id",
      baseFilters(tenantId, query, window),
    );
    return this.respond(groups, window.fromDays);
  }

  static async getByProvider(
    db: DrizzleD1Database,
    tenantId: string,
    query: UsageQuery,
  ) {
    const window = resolveWindow(query);
    const groups = await UsageEventRepository.groupBy(
      db,
      "provider",
      baseFilters(tenantId, query, window),
    );
    return this.respond(groups, window.fromDays);
  }

  static async getByModel(
    db: DrizzleD1Database,
    tenantId: string,
    query: UsageQuery,
  ) {
    const window = resolveWindow(query);
    const groups = await UsageEventRepository.groupBy(
      db,
      "model",
      baseFilters(tenantId, query, window),
    );
    return this.respond(groups, window.fromDays);
  }

  static async getByAction(
    db: DrizzleD1Database,
    tenantId: string,
    query: UsageQuery,
  ) {
    const window = resolveWindow(query);
    const groups = await UsageEventRepository.groupBy(
      db,
      "action",
      baseFilters(tenantId, query, window),
    );
    return this.respond(groups, window.fromDays);

  }

  static async getSeries(
    db: DrizzleD1Database,
    tenantId: string,
    query: UsageQuery,
  ): Promise<UsageSeriesPoint[]> {
    const window = resolveWindow(query);
    const rows = await UsageEventRepository.dailySeries(
      db,
      baseFilters(tenantId, query, window),
    );
    return rows.map((r) => ({
      day: r.day,
      cost_usd: Number(r.cost_usd ?? 0),
      requests: Number(r.requests ?? 0),
    }));
  }

  static async getTotals(
    db: DrizzleD1Database,
    tenantId: string,
    query: UsageQuery,
  ) {
    const window = resolveWindow(query);
    const fromDays = window.fromDays;
    const filters = baseFilters(tenantId, query, window);
    const [totals, prev] = await Promise.all([
      UsageEventRepository.totals(db, filters),
      UsageEventRepository.previousTotals(db, filters, fromDays),
    ]);
    const previousCost = Number(prev.cost_usd ?? 0);
    const currentCost = Number(totals.cost_usd ?? 0);
    let pctChange: number | null = null;
    let direction: "up" | "down" | "flat" = "flat";
    if (previousCost > 0) {
      pctChange = ((currentCost - previousCost) / previousCost) * 100;
      direction = pctChange > 0.5 ? "up" : pctChange < -0.5 ? "down" : "flat";
    } else if (currentCost > 0) {
      pctChange = null;
      direction = "up";
    }
    const result: UsageTotals = {
      ...totals,
      fromDays,
      delta: { previousCost, pctChange, direction },
    };
    return {
      success: true,
      message: UsageEventMessages.FETCH_SUCCESS,
      totals: result,
    };
  }

  static async getProfitabilityBy(
    db: DrizzleD1Database,
    tenantId: string,
    by: string | undefined,
    query: UsageQuery,
  ) {
    const dim = resolveProfitabilityDim(by);
    const window = resolveWindow(query);
    const fromDays = window.fromDays;
    const rows = await UsageEventRepository.profitabilityGroupBy(
      db,
      dim,
      baseFilters(tenantId, query, window),
    );
    const groups: ProfitabilityGroup[] = rows.map((r) => {
      const revenue = Number(r.revenue_usd ?? 0);
      const cost = Number(r.cost_usd ?? 0);
      const { margin_usd, margin_pct } = computeMargin(revenue, cost);
      return {
        key: r.key as string | null,
        revenue_usd: revenue,
        cost_usd: cost,
        margin_usd,
        margin_pct,
        credits_charged: Number(r.credits_charged ?? 0),
        requests: Number(r.requests ?? 0),
      };
    });
    const totalRevenue = groups.reduce((s, g) => s + g.revenue_usd, 0);
    const totalCost = groups.reduce((s, g) => s + g.cost_usd, 0);
    const totalCredits = groups.reduce((s, g) => s + g.credits_charged, 0);
    const totalRequests = groups.reduce((s, g) => s + g.requests, 0);
    const { margin_usd, margin_pct } = computeMargin(totalRevenue, totalCost);
    const totals: ProfitabilityTotals = {
      revenue_usd: totalRevenue,
      cost_usd: totalCost,
      margin_usd,
      margin_pct,
      credits_charged: totalCredits,
      requests: totalRequests,
      fromDays,
    };
    return {
      success: true,
      message: UsageEventMessages.FETCH_SUCCESS,
      dimension: dim,
      groups,
      totals,
    };
  }

  static async getProfitabilityTotals(
    db: DrizzleD1Database,
    tenantId: string,
    query: UsageQuery,
  ) {
    const window = resolveWindow(query);
    const fromDays = window.fromDays;
    const row = await UsageEventRepository.profitabilityTotals(
      db,
      baseFilters(tenantId, query, window),
    );
    const revenue = Number(row.revenue_usd ?? 0);
    const cost = Number(row.cost_usd ?? 0);
    const { margin_usd, margin_pct } = computeMargin(revenue, cost);
    const totals: ProfitabilityTotals = {
      revenue_usd: revenue,
      cost_usd: cost,
      margin_usd,
      margin_pct,
      credits_charged: Number(row.credits_charged ?? 0),
      requests: Number(row.requests ?? 0),
      fromDays,
    };
    return {
      success: true,
      message: UsageEventMessages.FETCH_SUCCESS,
      totals,
    };
  }

  static async runCanary(db: DrizzleD1Database, tenantId: string) {
    const runId = crypto.randomUUID();
    await UsageEventRepository.insertMany(db, [
      {
        id: runId,
        tenant_id: tenantId,
        timestamp: Date.now(),
        app: "ve-track-canary",
        clerk_user_id: "canary-user",
        clerk_org_id: null,
        provider: "canary",
        model: "synthetic",
        prompt_tokens: 0,
        completion_tokens: 0,
        latency_ms: 0,
        cost_usd: 0,
        status_code: 200,
      },
    ]);
    const verify = await UsageEventRepository.findById(db, runId);
    return {
      success: !!verify,
      message: verify
        ? UsageEventMessages.CANARY_OK
        : UsageEventMessages.CANARY_FAIL,
      runId,
    };
  }

  private static respond(groups: UsageGroup[], fromDays: number) {
    const totals = groups.reduce(
      (acc, g) => ({
        cost_usd: acc.cost_usd + (g.cost_usd ?? 0),
        prompt_tokens: acc.prompt_tokens + (g.prompt_tokens ?? 0),
        completion_tokens: acc.completion_tokens + (g.completion_tokens ?? 0),
        requests: acc.requests + (g.requests ?? 0),
      }),
      { cost_usd: 0, prompt_tokens: 0, completion_tokens: 0, requests: 0 },
    );
    return {
      success: true,
      message: UsageEventMessages.FETCH_SUCCESS,
      groups,
      totals: { ...totals, fromDays } as UsageTotals,
    };
  }
}

export default UsageEventService;
