import { DrizzleD1Database } from "drizzle-orm/d1";
import { TrackerRepository } from "../repositories/tracker.repository";
import { TrackerCostRepository } from "../repositories/tracker-cost.repository";
import { TenantRepository } from "../repositories/tenant.repository";
import {
  getAdapter,
  isConnectorProvider,
  type DailyCost,
  type DailyRequests,
} from "../lib/connectors";
import {
  sealApiKey,
  openApiKey,
  sha256Hex,
  lastFour,
} from "../lib/connector-crypto";
import { resolveTenantEmail } from "../lib/tenant-email";
import ResendService from "../lib/resend";
import { TrackerMessages } from "../messages/tracker.messages";
import { CustomError, DuplicateError } from "../utils";
import { HTTP_STATUS_CODES } from "../constants";
import type { Env } from "../types";
import type {
  TrackerCreateBody,
  TrackerUpdateKeyBody,
} from "../interfaces/tracker.interface";

const PROVIDER_LABELS: Record<string, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
};

const labelFor = (provider: string): string =>
  PROVIDER_LABELS[provider] ?? provider;

const isAuthError = (detail: string): boolean =>
  /\b401\b|\b403\b|invalid|unauthor|rejected|revoked|expired/i.test(detail);

const buildKeyAlertHtml = (provider: string, accountRef: string): string => {
  const label = labelFor(provider);
  return `<div style="font-family:system-ui,sans-serif;max-width:520px;margin:auto">
  <h2 style="margin:0 0 12px">Your ${label} tracker key stopped working</h2>
  <p style="color:#444;line-height:1.6">
    ve-track could not pull cost from your ${label} account
    <strong>${accountRef}</strong>. The provider rejected the stored key, which
    usually means it was revoked, rotated, or expired.
  </p>
  <p style="color:#444;line-height:1.6">
    We have paused this tracker. Paste a fresh key to resume tracking your cost.
  </p>
  <p style="margin:24px 0">
    <a href="https://track.viewengine.ai/dashboard/trackers"
       style="background:#fd5200;color:#fff;padding:12px 20px;text-decoration:none;font-weight:600">
      Update the key
    </a>
  </p>
  <p style="color:#999;font-size:12px">ViewEngine Track</p>
</div>`;
};

const DAY_MS = 86_400_000;
const BACKFILL_DAYS = 30;
const OVERLAP_DAYS = 2;
const MAX_LOOKBACK_DAYS = 60;

const round6 = (n: number): number => Math.round(n * 1_000_000) / 1_000_000;

const requireSecret = (env: Env): string => {
  if (!env.CONNECTOR_ENC_KEY) {
    throw new CustomError(
      TrackerMessages.NOT_CONFIGURED,
      HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR,
    );
  }
  return env.CONNECTOR_ENC_KEY;
};

const buildDailyCostRows = (
  tracker: { id: string; tenant_id: string },
  costs: DailyCost[],
  requests: DailyRequests[],
) => {
  const byDay = new Map<string, { cost: number; requests: number | null }>();
  for (const c of costs) {
    const entry = byDay.get(c.day) ?? { cost: 0, requests: null };
    entry.cost += c.costUsd;
    byDay.set(c.day, entry);
  }
  for (const r of requests) {
    const entry = byDay.get(r.day) ?? { cost: 0, requests: null };
    entry.requests = (entry.requests ?? 0) + r.requests;
    byDay.set(r.day, entry);
  }
  return Array.from(byDay.entries()).map(([day, v]) => ({
    id: `${tracker.id}_${day}`,
    tracker_id: tracker.id,
    tenant_id: tracker.tenant_id,
    day,
    ts: Date.parse(`${day}T00:00:00Z`),
    cost_usd: round6(v.cost),
    requests: v.requests,
  }));
};

class TrackerService {
  static async listForTenant(db: DrizzleD1Database, tenantId: string) {
    const trackers = await TrackerRepository.fetchByTenant(db, tenantId);
    return {
      success: true,
      message: TrackerMessages.LIST_SUCCESS,
      trackers,
    };
  }

  static async create(
    db: DrizzleD1Database,
    env: Env,
    tenantId: string,
    body: TrackerCreateBody,
  ) {
    const secret = requireSecret(env);
    const provider = (body.provider ?? "").trim().toLowerCase();
    const apiKey = (body.apiKey ?? "").trim();

    if (!provider || !apiKey) {
      throw new CustomError(
        TrackerMessages.VALIDATION_ERROR,
        HTTP_STATUS_CODES.BAD_REQUEST,
      );
    }

    if (!isConnectorProvider(provider)) {
      throw new CustomError(
        TrackerMessages.UNSUPPORTED_PROVIDER,
        HTTP_STATUS_CODES.BAD_REQUEST,
      );
    }

    const adapter = getAdapter(provider)!;
    const validation = await adapter.validate(apiKey);
    if (!validation.ok) {
      throw new CustomError(
        validation.error ?? TrackerMessages.VALIDATION_ERROR,
        HTTP_STATUS_CODES.BAD_REQUEST,
      );
    }

    const dedupHash = await sha256Hex(
      `${provider}:${validation.dedupId ?? apiKey}`,
    );
    const existing = await TrackerRepository.fetchByDedup(
      db,
      tenantId,
      dedupHash,
    );
    if (existing) {
      throw new DuplicateError(
        TrackerMessages.DUPLICATE,
        HTTP_STATUS_CODES.FORBIDDEN,
      );
    }

    const accountRef = validation.accountRef ?? `acct ····${lastFour(apiKey)}`;
    const sealed = await sealApiKey(secret, tenantId, apiKey);
    const created = await TrackerRepository.create(db, {
      tenant_id: tenantId,
      provider,
      key_ciphertext: sealed.key_ciphertext,
      key_iv: sealed.key_iv,
      wrapped_dek: sealed.wrapped_dek,
      dek_iv: sealed.dek_iv,
      key_last4: lastFour(apiKey),
      dedup_hash: dedupHash,
      account_ref: accountRef,
      status: "active",
    });

    return {
      success: true,
      message: TrackerMessages.CREATE_SUCCESS,
      tracker: {
        id: created.id,
        provider: created.provider,
        key_last4: created.key_last4,
        account_ref: created.account_ref,
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
    const tracker = await TrackerRepository.fetchById(db, id);
    if (!tracker || tracker.tenant_id !== tenantId) {
      throw new CustomError(
        TrackerMessages.NOT_FOUND,
        HTTP_STATUS_CODES.NOT_FOUND,
      );
    }
    await TrackerCostRepository.deleteForTracker(db, id);
    await TrackerRepository.remove(db, id);
    return { success: true, message: TrackerMessages.DISCONNECT_SUCCESS };
  }

  static async getCostDetail(
    db: DrizzleD1Database,
    tenantId: string,
    id: string,
    query: { from?: string; to?: string },
  ) {
    const tracker = await TrackerRepository.fetchById(db, id);
    if (!tracker || tracker.tenant_id !== tenantId) {
      throw new CustomError(
        TrackerMessages.NOT_FOUND,
        HTTP_STATUS_CODES.NOT_FOUND,
      );
    }
    const from =
      query.from != null ? parseInt(query.from, 10) : Date.now() - 30 * DAY_MS;
    const to = query.to != null ? parseInt(query.to, 10) : undefined;

    console.log("[ve-track][tracker] getCostDetail", {
      trackerId: id,
      provider: tracker.provider,
      from,
      to,
    });

    let series: Awaited<ReturnType<typeof TrackerCostRepository.seriesBetween>>;
    let totals: Awaited<ReturnType<typeof TrackerCostRepository.totalsBetween>>;
    try {
      [series, totals] = await Promise.all([
        TrackerCostRepository.seriesBetween(db, id, from, to),
        TrackerCostRepository.totalsBetween(db, id, from, to),
      ]);
    } catch (err) {
      console.error(
        "[ve-track][tracker] getCostDetail query failed (is migration 0018_tracker_costs applied?)",
        id,
        err,
      );
      throw err;
    }

    console.log("[ve-track][tracker] getCostDetail result", {
      trackerId: id,
      points: series.length,
      totals,
    });

    return {
      success: true,
      detail: {
        series: series.map((s) => ({
          day: s.day,
          cost_usd: Number(s.cost_usd ?? 0),
          requests: Number(s.requests ?? 0),
        })),
        totals: {
          cost_usd: Number(totals.cost_usd ?? 0),
          requests: Number(totals.requests ?? 0),
        },
      },
    };
  }

  static async updateKey(
    db: DrizzleD1Database,
    env: Env,
    tenantId: string,
    id: string,
    body: TrackerUpdateKeyBody,
  ) {
    const secret = requireSecret(env);
    const tracker = await TrackerRepository.fetchById(db, id);
    if (!tracker || tracker.tenant_id !== tenantId) {
      throw new CustomError(
        TrackerMessages.NOT_FOUND,
        HTTP_STATUS_CODES.NOT_FOUND,
      );
    }

    const apiKey = (body.apiKey ?? "").trim();
    if (!apiKey) {
      throw new CustomError(
        TrackerMessages.VALIDATION_ERROR,
        HTTP_STATUS_CODES.BAD_REQUEST,
      );
    }

    const adapter = getAdapter(tracker.provider)!;
    const validation = await adapter.validate(apiKey);
    if (!validation.ok) {
      throw new CustomError(
        validation.error ?? TrackerMessages.VALIDATION_ERROR,
        HTTP_STATUS_CODES.BAD_REQUEST,
      );
    }

    const dedupHash = await sha256Hex(
      `${tracker.provider}:${validation.dedupId ?? apiKey}`,
    );
    const clash = await TrackerRepository.fetchByDedup(db, tenantId, dedupHash);
    if (clash && clash.id !== id) {
      throw new DuplicateError(
        TrackerMessages.DUPLICATE,
        HTTP_STATUS_CODES.FORBIDDEN,
      );
    }

    const accountRef = validation.accountRef ?? `acct ····${lastFour(apiKey)}`;
    const sealed = await sealApiKey(secret, tenantId, apiKey);
    const updated = await TrackerRepository.update(db, id, {
      key_ciphertext: sealed.key_ciphertext,
      key_iv: sealed.key_iv,
      wrapped_dek: sealed.wrapped_dek,
      dek_iv: sealed.dek_iv,
      key_last4: lastFour(apiKey),
      dedup_hash: dedupHash,
      account_ref: accountRef,
      status: "active",
      last_error: null,
    });

    return {
      success: true,
      message: TrackerMessages.UPDATE_SUCCESS,
      tracker: {
        id: updated.id,
        provider: updated.provider,
        key_last4: updated.key_last4,
        account_ref: updated.account_ref,
        status: updated.status,
        last_error: updated.last_error,
        last_synced_at: updated.last_synced_at,
        pulled_cost_usd: updated.pulled_cost_usd,
        created_at: updated.created_at,
        updated_at: updated.updated_at,
      },
    };
  }

  static async sync(db: DrizzleD1Database, env: Env, id: string) {
    const secret = requireSecret(env);
    const tracker = await TrackerRepository.fetchById(db, id);
    if (!tracker) {
      throw new CustomError(
        TrackerMessages.NOT_FOUND,
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
      let requests: DailyRequests[] = [];
      if (adapter.pullDailyRequests) {
        try {
          requests = await adapter.pullDailyRequests(key, startMs);
        } catch (err) {
          console.warn(
            "[ve-track][tracker] request-count pull failed, saving cost only",
            tracker.id,
            err instanceof Error ? err.message : err,
          );
        }
      }
      const rows = buildDailyCostRows(tracker, costs, requests);
      console.log("[ve-track][tracker] sync pulled", {
        trackerId: tracker.id,
        provider: tracker.provider,
        costLines: costs.length,
        requestDays: requests.length,
        dayRows: rows.length,
        sinceMs: startMs,
      });
      await TrackerCostRepository.upsertMany(db, rows);
      const total = await TrackerCostRepository.sumForTracker(db, tracker.id);
      await TrackerRepository.update(db, id, {
        status: "active",
        last_error: null,
        last_synced_at: now,
        pulled_cost_usd: round6(total),
      });
      return { success: true, message: TrackerMessages.SYNC_SUCCESS };
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      console.error("[ve-track][connectors] sync failed", tracker.id, detail);
      const wasHealthy = tracker.status !== "error";
      await TrackerRepository.update(db, id, {
        status: "error",
        last_error: detail.slice(0, 240),
      });
      if (wasHealthy && isAuthError(detail)) {
        await this.notifyKeyProblem(db, env, tracker);
      }
      return { success: false, message: detail };
    }
  }

  private static async notifyKeyProblem(
    db: DrizzleD1Database,
    env: Env,
    tracker: { tenant_id: string; provider: string; account_ref: string | null; key_last4: string },
  ) {
    if (!env.RESEND_API_KEY || !env.RESEND_FROM_EMAIL) return;
    try {
      const tenant = await TenantRepository.fetchById(db, tracker.tenant_id);
      if (!tenant) return;
      const to = await resolveTenantEmail(env, tenant);
      if (!to) return;
      const accountRef = tracker.account_ref ?? `account ····${tracker.key_last4}`;
      await ResendService.send(
        { apiKey: env.RESEND_API_KEY },
        {
          from: env.RESEND_FROM_EMAIL,
          to,
          subject: `Action needed · your ${labelFor(tracker.provider)} tracker key stopped working`,
          html: buildKeyAlertHtml(tracker.provider, accountRef),
        },
      );
    } catch (err) {
      console.warn("[ve-track][connectors] key alert failed", err);
    }
  }

  static async syncAll(db: DrizzleD1Database, env: Env) {
    if (!env.CONNECTOR_ENC_KEY) return;
    const trackers = await TrackerRepository.fetchActive(db);
    for (const tracker of trackers) {
      await this.sync(db, env, tracker.id);
    }
  }

  static async enqueueAll(db: DrizzleD1Database, env: Env) {
    if (!env.CONNECTOR_ENC_KEY || !env.TRACKER_QUEUE) return;
    const trackers = await TrackerRepository.fetchActive(db);
    if (trackers.length === 0) return;
    const messages = trackers.map((t) => ({ body: { trackerId: t.id } }));
    for (let i = 0; i < messages.length; i += 100) {
      await env.TRACKER_QUEUE.sendBatch(messages.slice(i, i + 100));
    }
  }
}

export default TrackerService;
