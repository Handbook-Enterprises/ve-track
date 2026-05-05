import type { Provider } from "./types";

interface ModelPrice {
  inputPerM: number;
  outputPerM: number;
}

const MODEL_PRICING: Array<{ match: RegExp; price: ModelPrice }> = [
  { match: /^gpt-5\b(?!-mini|-nano)/i, price: { inputPerM: 1.25, outputPerM: 10 } },
  { match: /^gpt-5-mini/i, price: { inputPerM: 0.25, outputPerM: 2 } },
  { match: /^gpt-5-nano/i, price: { inputPerM: 0.05, outputPerM: 0.4 } },
  { match: /^gpt-4o-mini/i, price: { inputPerM: 0.15, outputPerM: 0.6 } },
  { match: /^gpt-4o/i, price: { inputPerM: 2.5, outputPerM: 10 } },
  { match: /^gpt-4\.1-mini/i, price: { inputPerM: 0.4, outputPerM: 1.6 } },
  { match: /^gpt-4\.1/i, price: { inputPerM: 2, outputPerM: 8 } },
  { match: /^gpt-4-turbo/i, price: { inputPerM: 10, outputPerM: 30 } },
  { match: /^gpt-4\b/i, price: { inputPerM: 30, outputPerM: 60 } },
  { match: /^gpt-3\.5/i, price: { inputPerM: 0.5, outputPerM: 1.5 } },
  { match: /^o3-mini/i, price: { inputPerM: 1.1, outputPerM: 4.4 } },
  { match: /^o3\b/i, price: { inputPerM: 2, outputPerM: 8 } },

  { match: /^claude-opus-4-7/i, price: { inputPerM: 15, outputPerM: 75 } },
  { match: /^claude-opus-4/i, price: { inputPerM: 15, outputPerM: 75 } },
  { match: /^claude-sonnet-4-6/i, price: { inputPerM: 3, outputPerM: 15 } },
  { match: /^claude-sonnet-4-5/i, price: { inputPerM: 3, outputPerM: 15 } },
  { match: /^claude-sonnet-4/i, price: { inputPerM: 3, outputPerM: 15 } },
  { match: /^claude-haiku-4-5/i, price: { inputPerM: 0.25, outputPerM: 1.25 } },
  { match: /^claude-3-5-sonnet/i, price: { inputPerM: 3, outputPerM: 15 } },
  { match: /^claude-3-5-haiku/i, price: { inputPerM: 0.8, outputPerM: 4 } },
  { match: /^claude-3-opus/i, price: { inputPerM: 15, outputPerM: 75 } },
  { match: /^claude-3-sonnet/i, price: { inputPerM: 3, outputPerM: 15 } },
  { match: /^claude-3-haiku/i, price: { inputPerM: 0.25, outputPerM: 1.25 } },

  { match: /^gemini-2\.5-pro/i, price: { inputPerM: 1.25, outputPerM: 10 } },
  { match: /^gemini-2\.5-flash-lite/i, price: { inputPerM: 0.1, outputPerM: 0.4 } },
  { match: /^gemini-2\.5-flash/i, price: { inputPerM: 0.3, outputPerM: 2.5 } },
  { match: /^gemini-1\.5-pro/i, price: { inputPerM: 1.25, outputPerM: 5 } },
  { match: /^gemini-1\.5-flash/i, price: { inputPerM: 0.075, outputPerM: 0.3 } },
  { match: /^gemini-2\.0-flash/i, price: { inputPerM: 0.1, outputPerM: 0.4 } },
];

const priceLookup = (model: string | null | undefined): ModelPrice | null => {
  if (!model) return null;
  const entry = MODEL_PRICING.find((p) => p.match.test(model));
  return entry ? entry.price : null;
};

const computeCost = (
  model: string | null | undefined,
  promptTokens: number | null | undefined,
  completionTokens: number | null | undefined,
): number => {
  const price = priceLookup(model);
  if (!price) {
    if (model) console.warn("[ve-track][pricing] unknown model — cost falls back to 0", model);
    return 0;
  }
  const input = (promptTokens ?? 0) * price.inputPerM;
  const output = (completionTokens ?? 0) * price.outputPerM;
  const cost = (input + output) / 1_000_000;
  return Math.round(cost * 1_000_000) / 1_000_000;
};

export const PROVIDERS: Provider[] = [
  {
    name: "openrouter",
    match: (u) => u.includes("openrouter.ai/api"),
    enhance: (init, app, user) => {
      const headers = new Headers(init.headers);
      headers.set("X-OpenRouter-Title", app);
      init.headers = headers;
      if (typeof init.body === "string" && user.userId) {
        try {
          init.body = JSON.stringify({
            ...JSON.parse(init.body),
            user: user.userId,
          });
        } catch {
          /* */
        }
      }
    },
    extract: async (resp) => {
      if (resp.headers.get("content-type")?.includes("event-stream")) return null;
      const j: any = await resp.clone().json().catch(() => null);
      if (!j?.usage) return null;
      const promptTokens = j.usage.prompt_tokens;
      const completionTokens = j.usage.completion_tokens;
      const explicit = typeof j.usage.cost === "number" ? j.usage.cost : null;
      const costUsd = explicit ?? computeCost(j.model, promptTokens, completionTokens);
      return { costUsd, model: j.model, promptTokens, completionTokens };
    },
  },
  {
    name: "openai",
    match: (u) => u.includes("api.openai.com"),
    enhance: (init, _app, user) => {
      if (typeof init.body === "string" && user.userId) {
        try {
          init.body = JSON.stringify({
            ...JSON.parse(init.body),
            user: user.userId,
          });
        } catch {
          /* */
        }
      }
    },
    extract: async (resp) => {
      const j: any = await resp.clone().json().catch(() => null);
      if (!j?.usage) return null;
      const promptTokens = j.usage.prompt_tokens ?? j.usage.input_tokens;
      const completionTokens = j.usage.completion_tokens ?? j.usage.output_tokens;
      const costUsd = computeCost(j.model, promptTokens, completionTokens);
      return { costUsd, model: j.model, promptTokens, completionTokens };
    },
  },
  {
    name: "anthropic",
    match: (u) => u.includes("api.anthropic.com"),
    enhance: (init, _app, user) => {
      if (typeof init.body === "string" && user.userId) {
        try {
          const body = JSON.parse(init.body);
          init.body = JSON.stringify({
            ...body,
            metadata: { ...(body.metadata ?? {}), user_id: user.userId },
          });
        } catch {
          /* */
        }
      }
    },
    extract: async (resp) => {
      const j: any = await resp.clone().json().catch(() => null);
      if (!j?.usage) return null;
      const promptTokens = j.usage.input_tokens;
      const completionTokens = j.usage.output_tokens;
      const costUsd = computeCost(j.model, promptTokens, completionTokens);
      return { costUsd, model: j.model, promptTokens, completionTokens };
    },
  },
  {
    name: "gemini",
    match: (u) =>
      u.includes("generativelanguage.googleapis.com") ||
      u.includes("aiplatform.googleapis.com"),
    extract: async (resp) => {
      const j: any = await resp.clone().json().catch(() => null);
      if (!j) return null;
      const usage = j.usageMetadata ?? j.usage_metadata ?? j.usage;
      if (!usage) return null;
      const promptTokens = usage.promptTokenCount ?? usage.prompt_token_count ?? usage.promptTokens;
      const completionTokens =
        usage.candidatesTokenCount ??
        usage.candidates_token_count ??
        usage.completionTokens ??
        usage.outputTokenCount;
      const model = j.modelVersion ?? j.model ?? j.model_version ?? null;
      const costUsd = computeCost(model, promptTokens, completionTokens);
      return { costUsd, model, promptTokens, completionTokens };
    },
  },
  {
    name: "zyte",
    match: (u) => u.includes("api.zyte.com"),
    extract: async (resp) => {
      const headerCost = parseFloat(resp.headers.get("Zyte-Request-Cost") ?? "0");
      if (headerCost > 0) return { costUsd: headerCost };
      const j: any = await resp.clone().json().catch(() => null);
      const bodyCost = j?.requestCost ?? j?.cost ?? 0;
      return bodyCost > 0 ? { costUsd: bodyCost } : { costUsd: 0.001 };
    },
  },
  {
    name: "dataforseo",
    match: (u) => u.includes("api.dataforseo.com"),
    extract: async (resp) => {
      const j: any = await resp.clone().json().catch(() => null);
      const cost = j?.cost ?? j?.tasks?.[0]?.cost ?? 0;
      return { costUsd: cost };
    },
  },
  {
    name: "apify",
    match: (u) => u.includes("api.apify.com"),
    extract: async (resp) => {
      const j: any = await resp.clone().json().catch(() => null);
      const data = j?.data ?? j;
      const cost = data?.usageTotalUsd ?? data?.stats?.computeUnits ?? 0;
      return { costUsd: typeof cost === "number" ? cost : 0 };
    },
  },
  {
    name: "firecrawl",
    match: (u) => u.includes("api.firecrawl.dev"),
    extract: async (resp) => {
      const j: any = await resp.clone().json().catch(() => null);
      const credits = j?.creditsUsed ?? j?.data?.creditsUsed ?? 0;
      return { costUsd: 0, promptTokens: credits };
    },
  },
  {
    name: "brightdata",
    match: (u) => u.includes("brightdata.com") || u.includes("luminati.io"),
    extract: async () => ({ costUsd: 0.0015 }),
  },
];
