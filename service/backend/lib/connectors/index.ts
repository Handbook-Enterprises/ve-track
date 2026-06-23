import { sha256Hex } from "../connector-crypto";

export interface TrackerResult {
  monthlySpend: number | null;
  weeklySpend: number | null;
  creditsRemaining: number | null;
  balanceUsd: number | null;
  totalUsageUsd: number | null;
  requestCount: number | null;
}

export interface ValidateResult {
  ok: boolean;
  dedupId: string | null;
  accountRef?: string | null;
  error?: string;
}

export interface PullContext {
  baseTotalUsd: number | null;
  fromDay: string | null;
}

export interface ConnectorAdapter {
  validate(key: string): Promise<ValidateResult>;
  pull(key: string, ctx?: PullContext): Promise<TrackerResult>;
}

export const CONNECTOR_PROVIDERS = [
  "openai",
  "anthropic",
  "openrouter",
  "apify",
  "dataforseo",
  "zyte",
] as const;
export type ConnectorProvider = (typeof CONNECTOR_PROVIDERS)[number];

export const EMPTY_RESULT: TrackerResult = {
  monthlySpend: null,
  weeklySpend: null,
  creditsRemaining: null,
  balanceUsd: null,
  totalUsageUsd: null,
  requestCount: null,
};

const DAY_MS = 86_400_000;
const CENTS_PER_USD = 100;
const MICRO_PER_USD = 1_000_000;
const MAX_BACKFILL_PAGES = 200;
const MAX_BACKFILL_MONTHS = 120;

const OPENAI_FLOOR_UNIX = Math.floor(
  Date.parse("2023-12-20T00:00:00Z") / 1000,
);
const ANTHROPIC_FLOOR_ISO = "2023-01-01T00:00:00Z";

const nextDayUnix = (day: string): number =>
  Math.floor((Date.parse(`${day}T00:00:00Z`) + DAY_MS) / 1000);

const nextDayIso = (day: string): string =>
  new Date(Date.parse(`${day}T00:00:00Z`) + DAY_MS).toISOString();

// ===== OpenAI =====

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
    const accountRef = dedupId && dedupId.startsWith("org") ? dedupId : null;
    if (!dedupId) dedupId = await sha256Hex(`openai:${key}`);
    return { ok: true, dedupId, accountRef };
  },

  async pull(key, ctx) {
    const startUnix = ctx?.fromDay ? nextDayUnix(ctx.fromDay) : OPENAI_FLOOR_UNIX;
    const windowSpend = await openaiSum(key, startUnix);
    return {
      ...EMPTY_RESULT,
      totalUsageUsd: (ctx?.baseTotalUsd ?? 0) + windowSpend,
    };
  },
};

async function openaiSum(key: string, startUnix: number): Promise<number> {
  let total = 0;
  let page: string | undefined;
  for (let i = 0; i < MAX_BACKFILL_PAGES; i++) {
    const url = new URL("https://api.openai.com/v1/organization/costs");
    url.searchParams.set("start_time", String(startUnix));
    url.searchParams.set("bucket_width", "1d");
    url.searchParams.set("limit", "180");
    if (page) url.searchParams.set("page", page);
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(
        "[ve-track][connectors] openai costs failed",
        res.status,
        body.slice(0, 300),
      );
      throw new Error(`OpenAI costs responded ${res.status}`);
    }
    const body: any = await res.json();
    for (const bucket of body?.data ?? []) {
      const items: any[] = bucket?.result ?? bucket?.results ?? [];
      for (const item of items) {
        if (item?.object === "organization.costs.result") {
          const value = Number(item?.amount?.value);
          if (Number.isFinite(value)) total += value;
        }
      }
    }
    if (body?.has_more && body?.next_page) page = body.next_page;
    else break;
  }
  return total;
}

// ===== Anthropic =====

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

  async pull(key, ctx) {
    const startIso = ctx?.fromDay ? nextDayIso(ctx.fromDay) : ANTHROPIC_FLOOR_ISO;
    const windowSpend = await anthropicSum(key, startIso);
    return {
      ...EMPTY_RESULT,
      totalUsageUsd: (ctx?.baseTotalUsd ?? 0) + windowSpend,
    };
  },
};

async function anthropicSum(key: string, startingAtIso: string): Promise<number> {
  let total = 0;
  let page: string | undefined;
  for (let i = 0; i < MAX_BACKFILL_PAGES; i++) {
    const params = new URLSearchParams({
      starting_at: startingAtIso,
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
      console.error(
        "[ve-track][connectors] anthropic cost_report failed",
        res.status,
        body.slice(0, 300),
      );
      throw new Error(`Anthropic cost_report responded ${res.status}`);
    }
    const data: any = await res.json();
    for (const bucket of data?.data ?? []) {
      for (const r of bucket?.results ?? []) {
        total += Number(r?.amount ?? 0) / CENTS_PER_USD;
      }
    }
    if (data?.has_more && data?.next_page) page = data.next_page;
    else break;
  }
  return total;
}

// ===== OpenRouter =====

const openrouter: ConnectorAdapter = {
  async validate(key) {
    const res = await fetch("https://openrouter.ai/api/v1/credits", {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!res.ok) {
      return {
        ok: false,
        dedupId: null,
        error:
          res.status === 401 || res.status === 403
            ? "OpenRouter rejected this key. Use a provisioning key from Settings → Provisioning Keys."
            : `OpenRouter rejected the key (${res.status}).`,
      };
    }
    return { ok: true, dedupId: await sha256Hex(`openrouter:${key}`) };
  },

  async pull(key) {
    const res = await fetch("https://openrouter.ai/api/v1/credits", {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(
        "[ve-track][connectors] openrouter credits failed",
        res.status,
        body.slice(0, 300),
      );
      throw new Error(`OpenRouter credits responded ${res.status}`);
    }
    const data: any = await res.json();
    const totalUsage = Number(data?.data?.total_usage ?? 0);
    return { ...EMPTY_RESULT, totalUsageUsd: totalUsage };
  },
};

// ===== Apify =====

const APIFY_BASE = "https://api.apify.com/v2";

const apify: ConnectorAdapter = {
  async validate(key) {
    const res = await fetch(`${APIFY_BASE}/users/me`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!res.ok) {
      return {
        ok: false,
        dedupId: null,
        error:
          res.status === 401
            ? "Apify rejected this token. Use a personal API token from Settings → Integrations."
            : `Apify rejected the token (${res.status}).`,
      };
    }
    const data: any = await res.json().catch(() => null);
    const id = data?.data?.id ?? null;
    const username = data?.data?.username ?? null;
    return {
      ok: true,
      dedupId: id ?? (await sha256Hex(`apify:${key}`)),
      accountRef: username ?? null,
    };
  },

  async pull(key, ctx) {
    if (ctx?.fromDay && ctx.baseTotalUsd != null) {
      const today = new Date().toISOString().slice(0, 10);
      const windowSpend = await apifyWindowSpend(key, ctx.fromDay, today);
      return {
        ...EMPTY_RESULT,
        totalUsageUsd: ctx.baseTotalUsd + windowSpend,
      };
    }
    return { ...EMPTY_RESULT, totalUsageUsd: await apifyLifetime(key) };
  },
};

const APIFY_STEP_MS = 28 * DAY_MS;

async function apifyMonthly(
  key: string,
  anchorMs: number,
): Promise<{
  cycleStart: string;
  cycleTotal: number;
  daily: Array<{ date: string; usd: number }>;
}> {
  const url = new URL(`${APIFY_BASE}/users/me/usage/monthly`);
  url.searchParams.set("date", new Date(anchorMs).toISOString().slice(0, 10));
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${key}` },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(
      "[ve-track][connectors] apify usage/monthly failed",
      res.status,
      body.slice(0, 300),
    );
    throw new Error(`Apify usage/monthly responded ${res.status}`);
  }
  const data: any = await res.json();
  const d = data?.data ?? {};
  return {
    cycleStart: String(d?.usageCycle?.startAt ?? ""),
    cycleTotal: Number(d?.totalUsageCreditsUsdAfterVolumeDiscount ?? 0),
    daily: (d?.dailyServiceUsages ?? []).map((x: any) => ({
      date: String(x?.date ?? "").slice(0, 10),
      usd: Number(x?.totalUsageCreditsUsd ?? 0),
    })),
  };
}

async function apifyLifetime(key: string): Promise<number> {
  const me = await fetch(`${APIFY_BASE}/users/me`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  const meData: any = me.ok ? await me.json().catch(() => null) : null;
  const createdAt = meData?.data?.createdAt;
  const startMs = createdAt
    ? Date.parse(createdAt)
    : Date.now() - 365 * DAY_MS;
  const now = Date.now();
  const seen = new Set<string>();
  let total = 0;
  let cursor = startMs;
  for (let i = 0; i < MAX_BACKFILL_MONTHS && cursor <= now; i++) {
    const { cycleStart, cycleTotal } = await apifyMonthly(key, cursor);
    if (cycleStart && !seen.has(cycleStart)) {
      seen.add(cycleStart);
      total += cycleTotal;
    }
    cursor += APIFY_STEP_MS;
  }
  return total;
}

async function apifyWindowSpend(
  key: string,
  fromDay: string,
  today: string,
): Promise<number> {
  const now = Date.now();
  const seenDays = new Set<string>();
  let total = 0;
  for (
    let cursor = Date.parse(`${fromDay}T00:00:00Z`);
    cursor <= now;
    cursor += APIFY_STEP_MS
  ) {
    const { daily } = await apifyMonthly(key, cursor);
    for (const d of daily) {
      if (d.date > fromDay && d.date <= today && !seenDays.has(d.date)) {
        seenDays.add(d.date);
        total += d.usd;
      }
    }
  }
  return total;
}

// ===== DataForSEO =====

const DATAFORSEO_BASE = "https://api.dataforseo.com/v3";

const dataforseoCreds = (key: string): { basic: string; login: string } => {
  const raw = key.trim();
  if (raw.includes(":")) {
    return { basic: btoa(raw), login: raw.slice(0, raw.indexOf(":")) };
  }
  let login = "";
  try {
    const decoded = atob(raw);
    const idx = decoded.indexOf(":");
    login = idx === -1 ? decoded : decoded.slice(0, idx);
  } catch {
    login = "";
  }
  return { basic: raw, login };
};

const dataforseo: ConnectorAdapter = {
  async validate(key) {
    const { basic, login } = dataforseoCreds(key);
    const res = await fetch(`${DATAFORSEO_BASE}/appendix/user_data`, {
      headers: { Authorization: `Basic ${basic}` },
    });
    if (!res.ok) {
      return {
        ok: false,
        dedupId: null,
        error:
          res.status === 401
            ? "DataForSEO rejected these credentials. Use your API key, or login:password, from your API access page."
            : `DataForSEO rejected the credentials (${res.status}).`,
      };
    }
    const data: any = await res.json().catch(() => null);
    if (data?.status_code && data.status_code !== 20000) {
      return {
        ok: false,
        dedupId: null,
        error: `DataForSEO error: ${data?.status_message ?? "unknown"}`,
      };
    }
    return {
      ok: true,
      dedupId: await sha256Hex(`dataforseo:${login || basic}`),
      accountRef: login || null,
    };
  },

  async pull(key) {
    const { basic } = dataforseoCreds(key);
    const res = await fetch(`${DATAFORSEO_BASE}/appendix/user_data`, {
      headers: { Authorization: `Basic ${basic}` },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(
        "[ve-track][connectors] dataforseo user_data failed",
        res.status,
        body.slice(0, 300),
      );
      throw new Error(`DataForSEO user_data responded ${res.status}`);
    }
    const data: any = await res.json();
    const money = data?.tasks?.[0]?.result?.[0]?.money;
    const total = money?.total;
    const balance = money?.balance;
    const totalUsage =
      total == null || balance == null
        ? null
        : Number(total) - Number(balance);
    return { ...EMPTY_RESULT, totalUsageUsd: totalUsage };
  },
};

// ===== Zyte =====

const ZYTE_STATS_URL = "https://zyte-api-stats.zyte.com/api/stats";
const ZYTE_EPOCH_ISO = "2020-01-01T00:00:00Z";
const ZYTE_WINDOW_MS = 364 * DAY_MS;

const splitZyteKey = (key: string): { apiKey: string; orgId: string } => {
  const idx = key.lastIndexOf(":");
  return {
    apiKey: idx === -1 ? key : key.slice(0, idx),
    orgId: idx === -1 ? "" : key.slice(idx + 1),
  };
};

const zyteAuth = (apiKey: string): string => `Basic ${btoa(`${apiKey}:`)}`;

async function zyteWindow(
  apiKey: string,
  orgId: string,
  startIso: string,
  endIso: string,
): Promise<{ usd: number; requests: number }> {
  const params = new URLSearchParams({
    organization_id: orgId,
    start_time: startIso,
    end_time: endIso,
  });
  const res = await fetch(`${ZYTE_STATS_URL}?${params.toString()}`, {
    headers: { Authorization: zyteAuth(apiKey) },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(
      "[ve-track][connectors] zyte stats failed",
      res.status,
      body.slice(0, 300),
    );
    throw new Error(`Zyte stats responded ${res.status}`);
  }
  const data: any = await res.json();
  let micro = 0;
  let requests = 0;
  for (const r of data?.results ?? []) {
    micro += Number(r?.cost_microusd_total ?? 0);
    requests += Number(r?.request_count ?? 0);
  }
  return { usd: micro / MICRO_PER_USD, requests };
}

const zyte: ConnectorAdapter = {
  async validate(key) {
    const { apiKey, orgId } = splitZyteKey(key);
    if (!orgId) {
      return {
        ok: false,
        dedupId: null,
        error: "Paste your Zyte key as apiKey:organizationId.",
      };
    }
    const res = await fetch(
      `${ZYTE_STATS_URL}?organization_id=${encodeURIComponent(orgId)}`,
      { headers: { Authorization: zyteAuth(apiKey) } },
    );
    if (!res.ok) {
      let error = `Zyte rejected the key (${res.status}).`;
      if (res.status === 401 || res.status === 403)
        error =
          "Zyte rejected this key. Use your Stats dashboard API key, not your Zyte API key.";
      else if (res.status === 422)
        error = "Zyte could not read this account. Check your organization id.";
      return { ok: false, dedupId: null, error };
    }
    return {
      ok: true,
      dedupId: await sha256Hex(`zyte:${orgId}`),
      accountRef: `org ${orgId}`,
    };
  },

  async pull(key) {
    const { apiKey, orgId } = splitZyteKey(key);
    const now = Date.now();
    let usd = 0;
    let cursor = Date.parse(ZYTE_EPOCH_ISO);
    for (let i = 0; i < MAX_BACKFILL_MONTHS && cursor < now; i++) {
      const winEnd = Math.min(cursor + ZYTE_WINDOW_MS, now);
      const w = await zyteWindow(
        apiKey,
        orgId,
        new Date(cursor).toISOString(),
        new Date(winEnd).toISOString(),
      );
      usd += w.usd;
      cursor = winEnd;
    }
    return { ...EMPTY_RESULT, totalUsageUsd: usd };
  },
};

const ADAPTERS: Record<ConnectorProvider, ConnectorAdapter> = {
  openai,
  anthropic,
  openrouter,
  apify,
  dataforseo,
  zyte,
};

export const getAdapter = (provider: string): ConnectorAdapter | null =>
  ADAPTERS[provider as ConnectorProvider] ?? null;

export const isConnectorProvider = (
  provider: string,
): provider is ConnectorProvider =>
  (CONNECTOR_PROVIDERS as readonly string[]).includes(provider);
