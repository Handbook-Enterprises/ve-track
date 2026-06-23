import { DrizzleD1Database } from "drizzle-orm/d1";
import { TrackerRepository } from "../repositories/tracker.repository";
import { TrackerCostRepository } from "../repositories/tracker-cost.repository";
import { TrackerSnapshotRepository } from "../repositories/tracker-snapshot.repository";
import { TenantRepository } from "../repositories/tenant.repository";
import {
  getAdapter,
  isConnectorProvider,
  type TrackerResult,
} from "../lib/connectors";
import {
  metricKind,
  isMoneyKind,
  valueFor,
  dailyDelta,
} from "../lib/tracker-spend";
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
  openrouter: "OpenRouter",
  apify: "Apify",
  dataforseo: "DataForSEO",
  zyte: "Zyte",
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
const LIFETIME_OVERLAP_DAYS = 10;

const round6 = (n: number | null): number | null =>
  n == null ? null : Math.round(n * 1_000_000) / 1_000_000;

const primaryValue = (m: {
  monthly_spend?: number | null;
  total_usage_usd?: number | null;
  balance_usd?: number | null;
  credits_remaining?: number | null;
  request_count?: number | null;
}): number =>
  m.monthly_spend ??
  m.total_usage_usd ??
  m.balance_usd ??
  m.credits_remaining ??
  m.request_count ??
  0;

const metricColumns = (r: TrackerResult) => ({
  monthly_spend: round6(r.monthlySpend),
  weekly_spend: round6(r.weeklySpend),
  balance_usd: round6(r.balanceUsd),
  total_usage_usd: round6(r.totalUsageUsd),
  credits_remaining: r.creditsRemaining,
  request_count: r.requestCount,
});

const publicTracker = (t: any) => ({
  id: t.id,
  provider: t.provider,
  key_last4: t.key_last4,
  account_ref: t.account_ref,
  status: t.status,
  last_error: t.last_error,
  last_synced_at: t.last_synced_at,
  pulled_cost_usd: t.pulled_cost_usd,
  monthly_spend: t.monthly_spend ?? null,
  weekly_spend: t.weekly_spend ?? null,
  balance_usd: t.balance_usd ?? null,
  total_usage_usd: t.total_usage_usd ?? null,
  credits_remaining: t.credits_remaining ?? null,
  request_count: t.request_count ?? null,
  window_spend: 0,
  is_money: isMoneyKind(metricKind(t)),
  created_at: t.created_at,
  updated_at: t.updated_at,
});

const requireSecret = (env: Env): string => {
  if (!env.CONNECTOR_ENC_KEY) {
    throw new CustomError(
      TrackerMessages.NOT_CONFIGURED,
      HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR,
    );
  }
  return env.CONNECTOR_ENC_KEY;
};

class TrackerService {
  static async listForTenant(db: DrizzleD1Database, tenantId: string) {
    const trackers = await TrackerRepository.fetchByTenant(db, tenantId);

    const enriched = trackers.map((t) => {
      const kind = metricKind(t);
      return {
        ...t,
        window_spend: primaryValue(t),
        is_money: isMoneyKind(kind),
      };
    });

    return {
      success: true,
      message: TrackerMessages.LIST_SUCCESS,
      trackers: enriched,
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
      tracker: publicTracker(created),
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
    await TrackerSnapshotRepository.deleteForTracker(db, id);
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
    const now = Date.now();
    const from =
      query.from != null ? parseInt(query.from, 10) : now - 28 * DAY_MS;
    const to = query.to != null ? parseInt(query.to, 10) : now;

    const kind = metricKind(tracker);
    const isMoney = isMoneyKind(kind);
    const snapshots = await TrackerSnapshotRepository.seriesBetween(
      db,
      id,
      from,
      to,
    );

    const series = snapshots
      .map((s) => ({
        day: s.day,
        value: kind === "usage" ? s.daily_spend ?? null : valueFor(kind, s),
      }))
      .filter((p): p is { day: string; value: number } => p.value != null);

    return {
      success: true,
      detail: {
        series,
        metrics: {
          monthly_spend: tracker.monthly_spend ?? null,
          weekly_spend: tracker.weekly_spend ?? null,
          balance_usd: tracker.balance_usd ?? null,
          total_usage_usd: tracker.total_usage_usd ?? null,
          credits_remaining: tracker.credits_remaining ?? null,
          request_count: tracker.request_count ?? null,
        },
        kind,
        isMoney,
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
      tracker: publicTracker(updated),
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
    const today = new Date(now).toISOString().slice(0, 10);
    const cutoff = new Date(now - LIFETIME_OVERLAP_DAYS * DAY_MS)
      .toISOString()
      .slice(0, 10);

    try {
      const key = await openApiKey(secret, tracker.tenant_id, tracker);
      const previous = await TrackerSnapshotRepository.latestBeforeDay(
        db,
        tracker.id,
        today,
      );
      const baseOld = await TrackerSnapshotRepository.latestOnOrBefore(
        db,
        tracker.id,
        cutoff,
      );
      const base = baseOld ?? previous;
      const result = await adapter.pull(key, {
        baseTotalUsd: base?.total_usage_usd ?? null,
        fromDay: base?.total_usage_usd != null ? base.day : null,
      });
      const metrics = metricColumns(result);
      const kind = metricKind(metrics);
      const daily_spend = dailyDelta(
        kind,
        previous ? valueFor(kind, previous) : null,
        valueFor(kind, metrics),
      );

      await TrackerSnapshotRepository.upsert(db, {
        id: `${tracker.id}_${today}`,
        tracker_id: tracker.id,
        tenant_id: tracker.tenant_id,
        day: today,
        ts: Date.parse(`${today}T00:00:00Z`),
        ...metrics,
        daily_spend,
      });

      await TrackerRepository.update(db, id, {
        status: "active",
        last_error: null,
        last_synced_at: now,
        pulled_cost_usd: primaryValue(metrics),
        ...metrics,
      });

      console.log("[ve-track][tracker] sync pulled", {
        trackerId: tracker.id,
        provider: tracker.provider,
        ...metrics,
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
