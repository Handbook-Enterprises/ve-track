import { DrizzleD1Database } from "drizzle-orm/d1";
import { UsageEventRepository } from "../repositories/usage-event.repository";
import { UsageEventMessages } from "../messages/usage-event.messages";
import { CustomError } from "../utils";
import { HTTP_STATUS_CODES } from "../constants";
import type {
  IngestBody,
  UsageEventInput,
  UsageGroup,
  UsageQuery,
  UsageTotals,
} from "../interfaces/usage-event.interface";

const DEFAULT_FROM_DAYS = 7;

const parseFromDays = (raw?: string): number => {
  const parsed = parseInt(raw ?? `${DEFAULT_FROM_DAYS}`, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_FROM_DAYS;
  return Math.min(parsed, 365);
};

const baseFilters = (
  tenantId: string,
  query: UsageQuery,
  fromDays: number,
) => ({
  tenant_id: tenantId,
  fromTs: UsageEventRepository.fromDaysToTs(fromDays),
  app: query.app || undefined,
  provider: query.provider || undefined,
  clerk_org_id: query.clerk_org_id || undefined,
  clerk_user_id: query.clerk_user_id || undefined,
});

const validateEvent = (e: UsageEventInput) => {
  if (!e || typeof e !== "object") return false;
  if (typeof e.id !== "string" || !e.id) return false;
  if (typeof e.timestamp !== "number" || !Number.isFinite(e.timestamp)) return false;
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
    const rows = valid.map((e) => ({
      id: e.id,
      tenant_id: tenantId,
      timestamp: e.timestamp,
      app: body.app,
      clerk_user_id: e.clerk_user_id ?? null,
      clerk_org_id: e.clerk_org_id ?? null,
      provider: e.provider,
      model: e.model ?? null,
      prompt_tokens: e.prompt_tokens ?? null,
      completion_tokens: e.completion_tokens ?? null,
      latency_ms: e.latency_ms ?? null,
      cost_usd: e.cost_usd ?? null,
      status_code: e.status_code ?? null,
    }));

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
    const fromDays = parseFromDays(query.fromDays);
    const groups = await UsageEventRepository.groupBy(
      db,
      "app",
      baseFilters(tenantId, query, fromDays),
    );
    return this.respond(groups, fromDays);
  }

  static async getByOrg(
    db: DrizzleD1Database,
    tenantId: string,
    query: UsageQuery,
  ) {
    const fromDays = parseFromDays(query.fromDays);
    const groups = await UsageEventRepository.groupBy(
      db,
      "clerk_org_id",
      baseFilters(tenantId, query, fromDays),
    );
    return this.respond(groups, fromDays);
  }

  static async getByUser(
    db: DrizzleD1Database,
    tenantId: string,
    query: UsageQuery,
  ) {
    const fromDays = parseFromDays(query.fromDays);
    const groups = await UsageEventRepository.groupBy(
      db,
      "clerk_user_id",
      baseFilters(tenantId, query, fromDays),
    );
    return this.respond(groups, fromDays);
  }

  static async getByProvider(
    db: DrizzleD1Database,
    tenantId: string,
    query: UsageQuery,
  ) {
    const fromDays = parseFromDays(query.fromDays);
    const groups = await UsageEventRepository.groupBy(
      db,
      "provider",
      baseFilters(tenantId, query, fromDays),
    );
    return this.respond(groups, fromDays);
  }

  static async getByModel(
    db: DrizzleD1Database,
    tenantId: string,
    query: UsageQuery,
  ) {
    const fromDays = parseFromDays(query.fromDays);
    const groups = await UsageEventRepository.groupBy(
      db,
      "model",
      baseFilters(tenantId, query, fromDays),
    );
    return this.respond(groups, fromDays);
  }

  static async getTotals(
    db: DrizzleD1Database,
    tenantId: string,
    query: UsageQuery,
  ) {
    const fromDays = parseFromDays(query.fromDays);
    const totals = await UsageEventRepository.totals(
      db,
      baseFilters(tenantId, query, fromDays),
    );
    const result: UsageTotals = { ...totals, fromDays };
    return {
      success: true,
      message: UsageEventMessages.FETCH_SUCCESS,
      totals: result,
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
