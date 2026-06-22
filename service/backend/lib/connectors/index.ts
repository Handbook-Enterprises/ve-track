import { sha256Hex } from "../connector-crypto";

export interface TrackerResult {
  monthlySpend: number | null;
  weeklySpend: number | null;
  creditsRemaining: number | null;
  balanceUsd: number | null;
  requestCount: number | null;
}

export interface ValidateResult {
  ok: boolean;
  dedupId: string | null;
  accountRef?: string | null;
  error?: string;
}

export interface ConnectorAdapter {
  validate(key: string): Promise<ValidateResult>;
  pull(key: string): Promise<TrackerResult>;
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
  requestCount: null,
};

const DAY_MS = 86_400_000;
const CENTS_PER_USD = 100;
const MICRO_PER_USD = 1_000_000;
const WEEK_SECONDS = 7 * 24 * 60 * 60;
const MAX_PAGES = 24;

const monthStartUnix = (): number =>
  Math.floor(
    Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1) / 1000,
  );

const monthStartIso = (): string =>
  new Date(
    Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1),
  ).toISOString();

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

  async pull(key) {
    const url = new URL("https://api.openai.com/v1/organization/costs");
    url.searchParams.set("start_time", String(monthStartUnix()));
    url.searchParams.set("bucket_width", "1d");
    url.searchParams.set("limit", "31");
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("[ve-track][connectors] openai costs failed", res.status, body.slice(0, 300));
      throw new Error(`OpenAI costs responded ${res.status}`);
    }
    const body: any = await res.json();
    const weekCutoff = Math.floor(Date.now() / 1000) - WEEK_SECONDS;
    let monthly = 0;
    let weekly = 0;
    let requests = 0;
    for (const bucket of body?.data ?? []) {
      const bucketStart = Number(bucket?.start_time) || 0;
      const items: any[] = bucket?.result ?? bucket?.results ?? [];
      for (const item of items) {
        if (item?.object === "organization.costs.result") {
          const value = Number(item?.amount?.value);
          if (Number.isFinite(value)) {
            monthly += value;
            if (bucketStart >= weekCutoff) weekly += value;
          }
        }
        const reqs = Number(item?.num_model_requests);
        if (Number.isFinite(reqs)) requests += reqs;
      }
    }
    return {
      ...EMPTY_RESULT,
      monthlySpend: monthly,
      weeklySpend: weekly,
      requestCount: requests > 0 ? requests : null,
    };
  },
};

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

  async pull(key) {
    const weekCutoff = Date.now() - WEEK_SECONDS * 1000;
    let monthly = 0;
    let weekly = 0;
    let page: string | undefined;
    for (let i = 0; i < MAX_PAGES; i++) {
      const params = new URLSearchParams({
        starting_at: monthStartIso(),
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
        const bucketMs = Date.parse(String(bucket?.starting_at ?? "")) || 0;
        for (const r of bucket?.results ?? []) {
          const usd = Number(r?.amount ?? 0) / CENTS_PER_USD;
          if (!usd) continue;
          monthly += usd;
          if (bucketMs >= weekCutoff) weekly += usd;
        }
      }
      if (data?.has_more && data?.next_page) page = data.next_page;
      else break;
    }
    return { ...EMPTY_RESULT, monthlySpend: monthly, weeklySpend: weekly };
  },
};

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
      console.error("[ve-track][connectors] openrouter credits failed", res.status, body.slice(0, 300));
      throw new Error(`OpenRouter credits responded ${res.status}`);
    }
    const data: any = await res.json();
    const totalCredits = Number(data?.data?.total_credits ?? 0);
    const totalUsage = Number(data?.data?.total_usage ?? 0);
    return { ...EMPTY_RESULT, balanceUsd: totalCredits - totalUsage };
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

  async pull(key) {
    const res = await fetch(`${APIFY_BASE}/users/me/limits`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("[ve-track][connectors] apify limits failed", res.status, body.slice(0, 300));
      throw new Error(`Apify limits responded ${res.status}`);
    }
    const data: any = await res.json();
    const current = data?.data?.current ?? {};
    return {
      ...EMPTY_RESULT,
      monthlySpend: current?.monthlyUsageUsd ?? null,
      requestCount: current?.activeActorJobCount ?? null,
    };
  },
};

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
      console.error("[ve-track][connectors] dataforseo user_data failed", res.status, body.slice(0, 300));
      throw new Error(`DataForSEO user_data responded ${res.status}`);
    }
    const data: any = await res.json();
    const money = data?.tasks?.[0]?.result?.[0]?.money;
    const balance = money?.balance;
    return {
      ...EMPTY_RESULT,
      balanceUsd: balance == null ? null : Number(balance),
    };
  },
};

// ===== Zyte =====

const ZYTE_STATS_URL = "https://zyte-api-stats.zyte.com/api/stats";

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
    console.error("[ve-track][connectors] zyte stats failed", res.status, body.slice(0, 300));
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
    const end = new Date().toISOString();
    const weekStart = new Date(Date.now() - WEEK_SECONDS * 1000).toISOString();
    const [month, week] = await Promise.all([
      zyteWindow(apiKey, orgId, monthStartIso(), end),
      zyteWindow(apiKey, orgId, weekStart, end),
    ]);
    return {
      ...EMPTY_RESULT,
      monthlySpend: month.usd,
      weeklySpend: week.usd,
      requestCount: month.requests || null,
    };
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
