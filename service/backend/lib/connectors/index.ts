import { sha256Hex } from "../connector-crypto";

export interface DailyCost {
  day: string;
  model: string;
  costUsd: number;
}

export interface DailyRequests {
  day: string;
  requests: number;
}

export interface ValidateResult {
  ok: boolean;
  dedupId: string | null;
  accountRef?: string | null;
  error?: string;
}

export interface ConnectorAdapter {
  validate(key: string): Promise<ValidateResult>;
  pullDailyCosts(key: string, startMs: number): Promise<DailyCost[]>;
  pullDailyRequests?(key: string, startMs: number): Promise<DailyRequests[]>;
}

export const CONNECTOR_PROVIDERS = ["openai", "anthropic"] as const;
export type ConnectorProvider = (typeof CONNECTOR_PROVIDERS)[number];

const DAY_MS = 86_400_000;
const CENTS_PER_USD = 100;
const MAX_PAGES = 24;

const unixToDay = (seconds: number): string =>
  new Date(seconds * 1000).toISOString().slice(0, 10);

const openai: ConnectorAdapter = {
  async validate(key) {
    const startUnix = Math.floor((Date.now() - DAY_MS) / 1000);
    const res = await fetch(
      `https://api.openai.com/v1/organization/costs?start_time=${startUnix}&limit=1`,
      { headers: { Authorization: `Bearer ${key}` } },
    );
    if (!res.ok) {
      return {
        ok: false,
        dedupId: null,
        error:
          res.status === 401
            ? "OpenAI rejected this key. Use an admin key (sk-admin…) with cost access."
            : `OpenAI rejected the key (${res.status}).`,
      };
    }
    let dedupId: string | null = null;
    try {
      const me = await fetch("https://api.openai.com/v1/me", {
        headers: { Authorization: `Bearer ${key}` },
      });
      if (me.ok) {
        const data: any = await me.json();
        dedupId = data?.orgs?.data?.[0]?.id ?? data?.id ?? null;
      }
    } catch {
      dedupId = null;
    }
    const accountRef =
      dedupId && dedupId.startsWith("org") ? dedupId : null;
    if (!dedupId) dedupId = await sha256Hex(`openai:${key}`);
    return { ok: true, dedupId, accountRef };
  },

  async pullDailyCosts(key, startMs) {
    const startUnix = Math.floor(startMs / 1000);
    const out: DailyCost[] = [];
    let page: string | undefined;
    for (let i = 0; i < MAX_PAGES; i++) {
      const params = new URLSearchParams({
        start_time: String(startUnix),
        bucket_width: "1d",
        limit: "180",
      });
      params.append("group_by", "line_item");
      if (page) params.set("page", page);
      const res = await fetch(
        `https://api.openai.com/v1/organization/costs?${params.toString()}`,
        { headers: { Authorization: `Bearer ${key}` } },
      );
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        console.error("[ve-track][connectors] openai costs failed", res.status, body.slice(0, 300));
        throw new Error(`OpenAI costs responded ${res.status}`);
      }
      const data: any = await res.json();
      for (const bucket of data?.data ?? []) {
        const day = unixToDay(Number(bucket?.start_time ?? 0));
        for (const r of bucket?.results ?? []) {
          const value = Number(r?.amount?.value ?? 0);
          if (!value) continue;
          out.push({ day, model: r?.line_item ?? "usage", costUsd: value });
        }
      }
      if (data?.has_more && data?.next_page) page = data.next_page;
      else break;
    }
    return out;
  },

  async pullDailyRequests(key, startMs) {
    const startUnix = Math.floor(startMs / 1000);
    const out: DailyRequests[] = [];
    let page: string | undefined;
    for (let i = 0; i < MAX_PAGES; i++) {
      const params = new URLSearchParams({
        start_time: String(startUnix),
        bucket_width: "1d",
        limit: "31",
      });
      if (page) params.set("page", page);
      const res = await fetch(
        `https://api.openai.com/v1/organization/usage/completions?${params.toString()}`,
        { headers: { Authorization: `Bearer ${key}` } },
      );
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        console.error("[ve-track][connectors] openai usage failed", res.status, body.slice(0, 300));
        throw new Error(`OpenAI usage responded ${res.status}`);
      }
      const data: any = await res.json();
      for (const bucket of data?.data ?? []) {
        const day = unixToDay(Number(bucket?.start_time ?? 0));
        let requests = 0;
        for (const r of bucket?.results ?? [])
          requests += Number(r?.num_model_requests ?? 0);
        if (requests > 0) out.push({ day, requests });
      }
      if (data?.has_more && data?.next_page) page = data.next_page;
      else break;
    }
    return out;
  },
};

const anthropicHeaders = (key: string) => ({
  "x-api-key": key,
  "anthropic-version": "2023-06-01",
});

const anthropic: ConnectorAdapter = {
  async validate(key) {
    const starting = new Date(Date.now() - DAY_MS).toISOString();
    const res = await fetch(
      `https://api.anthropic.com/v1/organizations/cost_report?starting_at=${encodeURIComponent(
        starting,
      )}&bucket_width=1d&limit=1`,
      { headers: anthropicHeaders(key) },
    );
    if (!res.ok) {
      return {
        ok: false,
        dedupId: null,
        error:
          res.status === 401
            ? "Anthropic rejected this key. Use an admin key (sk-ant-admin…) on an organization account."
            : `Anthropic rejected the key (${res.status}).`,
      };
    }
    return { ok: true, dedupId: await sha256Hex(`anthropic:${key}`) };
  },

  async pullDailyCosts(key, startMs) {
    const out: DailyCost[] = [];
    const starting = new Date(startMs).toISOString();
    let page: string | undefined;
    for (let i = 0; i < MAX_PAGES; i++) {
      const params = new URLSearchParams({
        starting_at: starting,
        bucket_width: "1d",
        limit: "31",
      });
      params.append("group_by", "description");
      if (page) params.set("page", page);
      const res = await fetch(
        `https://api.anthropic.com/v1/organizations/cost_report?${params.toString()}`,
        { headers: anthropicHeaders(key) },
      );
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        console.error("[ve-track][connectors] anthropic cost_report failed", res.status, body.slice(0, 300));
        throw new Error(`Anthropic cost_report responded ${res.status}`);
      }
      const data: any = await res.json();
      for (const bucket of data?.data ?? []) {
        const day = String(bucket?.starting_at ?? "").slice(0, 10);
        if (!day) continue;
        for (const r of bucket?.results ?? []) {
          const cents = Number(r?.amount ?? 0);
          if (!cents) continue;
          out.push({
            day,
            model: r?.model ?? r?.description ?? "usage",
            costUsd: cents / CENTS_PER_USD,
          });
        }
      }
      if (data?.has_more && data?.next_page) page = data.next_page;
      else break;
    }
    return out;
  },
};

const ADAPTERS: Record<ConnectorProvider, ConnectorAdapter> = {
  openai,
  anthropic,
};

export const getAdapter = (provider: string): ConnectorAdapter | null =>
  ADAPTERS[provider as ConnectorProvider] ?? null;

export const isConnectorProvider = (provider: string): provider is ConnectorProvider =>
  (CONNECTOR_PROVIDERS as readonly string[]).includes(provider);
