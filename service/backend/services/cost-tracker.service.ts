import { DrizzleD1Database } from "drizzle-orm/d1";
import { CostTrackerRepository } from "../repositories/cost-tracker.repository";
import { UsageEventRepository } from "../repositories/usage-event.repository";
import {
  getAdapter,
  isConnectorProvider,
  type DailyCost,
} from "../lib/connectors";
import {
  sealApiKey,
  openApiKey,
  sha256Hex,
  lastFour,
} from "../lib/connector-crypto";
import { CostTrackerMessages } from "../messages/cost-tracker.messages";
import { CustomError, DuplicateError } from "../utils";
import { HTTP_STATUS_CODES } from "../constants";
import type { Env } from "../types";
import type { CostTrackerCreateBody } from "../interfaces/cost-tracker.interface";

const DAY_MS = 86_400_000;
const BACKFILL_DAYS = 30;
const OVERLAP_DAYS = 2;
const MAX_LOOKBACK_DAYS = 60;

const round6 = (n: number): number => Math.round(n * 1_000_000) / 1_000_000;

const slug = (model: string): string =>
  model
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "usage";

const shortHash = (input: string): string => {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) hash = (hash * 33) ^ input.charCodeAt(i);
  return (hash >>> 0).toString(16);
};

const requireSecret = (env: Env): string => {
  if (!env.CONNECTOR_ENC_KEY) {
    throw new CustomError(
      CostTrackerMessages.NOT_CONFIGURED,
      HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR,
    );
  }
  return env.CONNECTOR_ENC_KEY;
};

const buildBillingRows = (
  tracker: { id: string; tenant_id: string; provider: string; app: string },
  costs: DailyCost[],
) =>
  costs.map((c) => ({
    id: `cb_${tracker.id}_${c.day}_${slug(c.model)}_${shortHash(c.model)}`,
    tenant_id: tracker.tenant_id,
    timestamp: Date.parse(`${c.day}T00:00:00Z`),
    app: tracker.app,
    provider: tracker.provider,
    model: c.model,
    cost_usd: round6(c.costUsd),
    cost_source: "provider_billing",
    cost_confidence: "high",
    correlation_id: tracker.id,
  }));

class CostTrackerService {
  static async listForTenant(db: DrizzleD1Database, tenantId: string) {
    const trackers = await CostTrackerRepository.fetchByTenant(db, tenantId);
    return {
      success: true,
      message: CostTrackerMessages.LIST_SUCCESS,
      trackers,
    };
  }

  static async create(
    db: DrizzleD1Database,
    env: Env,
    tenantId: string,
    body: CostTrackerCreateBody,
  ) {
    const secret = requireSecret(env);
    const provider = (body.provider ?? "").trim().toLowerCase();
    const label = (body.label ?? "").trim();
    const app = (body.app ?? "").trim();
    const apiKey = (body.apiKey ?? "").trim();

    if (!provider || !label || !app || !apiKey) {
      throw new CustomError(
        CostTrackerMessages.VALIDATION_ERROR,
        HTTP_STATUS_CODES.BAD_REQUEST,
      );
    }

    if (!isConnectorProvider(provider)) {
      throw new CustomError(
        CostTrackerMessages.UNSUPPORTED_PROVIDER,
        HTTP_STATUS_CODES.BAD_REQUEST,
      );
    }

    const adapter = getAdapter(provider)!;
    const validation = await adapter.validate(apiKey);
    if (!validation.ok) {
      throw new CustomError(
        validation.error ?? CostTrackerMessages.VALIDATION_ERROR,
        HTTP_STATUS_CODES.BAD_REQUEST,
      );
    }

    const dedupHash = await sha256Hex(
      `${provider}:${validation.dedupId ?? apiKey}`,
    );
    const existing = await CostTrackerRepository.fetchByDedup(
      db,
      tenantId,
      dedupHash,
    );
    if (existing) {
      throw new DuplicateError(
        CostTrackerMessages.DUPLICATE,
        HTTP_STATUS_CODES.FORBIDDEN,
      );
    }

    const sealed = await sealApiKey(secret, tenantId, apiKey);
    const created = await CostTrackerRepository.create(db, {
      tenant_id: tenantId,
      provider,
      label,
      app,
      key_ciphertext: sealed.key_ciphertext,
      key_iv: sealed.key_iv,
      wrapped_dek: sealed.wrapped_dek,
      dek_iv: sealed.dek_iv,
      key_last4: lastFour(apiKey),
      dedup_hash: dedupHash,
      status: "active",
    });

    return {
      success: true,
      message: CostTrackerMessages.CREATE_SUCCESS,
      tracker: {
        id: created.id,
        provider: created.provider,
        label: created.label,
        app: created.app,
        key_last4: created.key_last4,
        status: created.status,
        last_error: created.last_error,
        last_synced_at: created.last_synced_at,
        pulled_cost_usd: created.pulled_cost_usd,
        created_at: created.created_at,
        updated_at: created.updated_at,
      },
    };
  }

  static async disconnect(db: DrizzleD1Database, tenantId: string, id: string) {
    const tracker = await CostTrackerRepository.fetchById(db, id);
    if (!tracker || tracker.tenant_id !== tenantId) {
      throw new CustomError(
        CostTrackerMessages.NOT_FOUND,
        HTTP_STATUS_CODES.NOT_FOUND,
      );
    }
    await CostTrackerRepository.remove(db, id);
    return { success: true, message: CostTrackerMessages.DISCONNECT_SUCCESS };
  }

  static async sync(db: DrizzleD1Database, env: Env, id: string) {
    const secret = requireSecret(env);
    const tracker = await CostTrackerRepository.fetchById(db, id);
    if (!tracker) {
      throw new CustomError(
        CostTrackerMessages.NOT_FOUND,
        HTTP_STATUS_CODES.NOT_FOUND,
      );
    }

    const adapter = getAdapter(tracker.provider);
    if (!adapter) return { success: false };

    const now = Date.now();
    const floor = now - MAX_LOOKBACK_DAYS * DAY_MS;
    const startMs = tracker.last_synced_at
      ? Math.max(floor, tracker.last_synced_at - OVERLAP_DAYS * DAY_MS)
      : now - BACKFILL_DAYS * DAY_MS;

    try {
      const key = await openApiKey(secret, tracker.tenant_id, tracker);
      const costs = await adapter.pullDailyCosts(key, startMs);
      const rows = buildBillingRows(tracker, costs);
      await UsageEventRepository.upsertBilling(db, rows);
      const total = await UsageEventRepository.sumBillingByCorrelation(
        db,
        tracker.tenant_id,
        tracker.id,
      );
      await CostTrackerRepository.update(db, id, {
        status: "active",
        last_error: null,
        last_synced_at: now,
        pulled_cost_usd: round6(total),
      });
      return { success: true, message: CostTrackerMessages.SYNC_SUCCESS };
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      console.error("[ve-track][connectors] sync failed", tracker.id, detail);
      await CostTrackerRepository.update(db, id, {
        status: "error",
        last_error: detail.slice(0, 240),
      });
      return { success: false, message: detail };
    }
  }

  static async syncAll(db: DrizzleD1Database, env: Env) {
    if (!env.CONNECTOR_ENC_KEY) return;
    const trackers = await CostTrackerRepository.fetchActive(db);
    for (const tracker of trackers) {
      await this.sync(db, env, tracker.id);
    }
  }
}

export default CostTrackerService;
