import type { Provider } from "./types";
import { isEventStream, parseSseData, readStreamUsageChunk } from "./sse";

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

  { match: /^sonar-deep-research/i, price: { inputPerM: 2, outputPerM: 8 } },
  { match: /^sonar-reasoning-pro/i, price: { inputPerM: 2, outputPerM: 8 } },
  { match: /^sonar-reasoning/i, price: { inputPerM: 1, outputPerM: 5 } },
  { match: /^sonar-pro/i, price: { inputPerM: 3, outputPerM: 15 } },
  { match: /^sonar/i, price: { inputPerM: 1, outputPerM: 1 } },

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

const CLORO_USD_PER_CREDIT = 0.04;
const FAL_IMAGE_USD = 0.01;

export const cloroCreditsToUsd = (credits: number): number =>
  Math.round(credits * CLORO_USD_PER_CREDIT * 1_000_000) / 1_000_000;

const CLORO_SYNC_ENDPOINTS: Array<{ match: RegExp; credits: number; model: string }> = [
  { match: /\/monitor\/chatgpt/i, credits: 7, model: "chatgpt" },
  { match: /\/monitor\/perplexity/i, credits: 5, model: "perplexity" },
  { match: /\/monitor\/gemini/i, credits: 6, model: "gemini" },
  { match: /\/monitor\/aimode/i, credits: 6, model: "aimode" },
];

const enableStreamUsage = (init: RequestInit): void => {
  if (typeof init.body !== "string") return;
  try {
    const body = JSON.parse(init.body);
    if (body?.stream !== true) return;
    body.stream_options = { ...(body.stream_options ?? {}), include_usage: true };
    init.body = JSON.stringify(body);
  } catch {
    /* */
  }
};

const readOpenAiUsage = async (
  resp: Response,
): Promise<{ usage: any; model: string | null } | null> => {
  if (isEventStream(resp)) {
    const chunks = parseSseData(await resp.text().catch(() => ""));
    const hit = readStreamUsageChunk(chunks);
    if (!hit) return null;
    return { usage: hit.usage, model: hit.model ?? chunks[0]?.model ?? null };
  }
  const j: any = await resp.clone().json().catch(() => null);
  if (!j?.usage) return null;
  return { usage: j.usage, model: j.model ?? null };
};

const splitCachedInput = (usage: any): { prompt: number; cached: number } => {
  const cached = usage.prompt_tokens_details?.cached_tokens ?? 0;
  const total = usage.prompt_tokens ?? usage.input_tokens ?? 0;
  return { prompt: Math.max(0, total - cached), cached };
};

const readGeminiUsage = async (resp: Response): Promise<any | null> => {
  if (isEventStream(resp)) {
    const chunks = parseSseData(await resp.text().catch(() => ""));
    for (let i = chunks.length - 1; i >= 0; i--) {
      const u = chunks[i]?.usageMetadata ?? chunks[i]?.usage_metadata;
      if (u) return { usage: u, model: chunks[i]?.modelVersion ?? chunks[i]?.model ?? null };
    }
    return null;
  }
  const j: any = await resp.clone().json().catch(() => null);
  if (!j) return null;
  const usage = j.usageMetadata ?? j.usage_metadata ?? j.usage;
  if (!usage) return null;
  return { usage, model: j.modelVersion ?? j.model ?? j.model_version ?? null };
};

const readAnthropicUsage = async (
  resp: Response,
): Promise<{ usage: any; model: string | null } | null> => {
  if (isEventStream(resp)) {
    const chunks = parseSseData(await resp.text().catch(() => ""));
    let model: string | null = null;
    let input = 0;
    let cacheRead = 0;
    let cacheWrite = 0;
    let output = 0;
    for (const ch of chunks) {
      if (ch?.type === "message_start" && ch.message) {
        model = ch.message.model ?? model;
        const mu = ch.message.usage ?? {};
        input = mu.input_tokens ?? input;
        cacheRead = mu.cache_read_input_tokens ?? cacheRead;
        cacheWrite = mu.cache_creation_input_tokens ?? cacheWrite;
        output = mu.output_tokens ?? output;
      } else if (ch?.type === "message_delta" && ch.usage) {
        output = ch.usage.output_tokens ?? output;
      }
    }
    if (!model && input === 0 && output === 0) return null;
    return {
      model,
      usage: {
        input_tokens: input,
        cache_read_input_tokens: cacheRead,
        cache_creation_input_tokens: cacheWrite,
        output_tokens: output,
      },
    };
  }
  const j: any = await resp.clone().json().catch(() => null);
  if (!j?.usage) return null;
  return { usage: j.usage, model: j.model ?? null };
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
      enableStreamUsage(init);
    },
    extract: async (resp) => {
      const payload = await readOpenAiUsage(resp);
      if (!payload) return null;
      const { usage, model } = payload;
      const { prompt, cached } = splitCachedInput(usage);
      const completionTokens = usage.completion_tokens ?? 0;
      const explicit = typeof usage.cost === "number" ? usage.cost : null;
      const costUsd = explicit ?? computeCost(model, prompt + cached, completionTokens);
      return {
        costUsd,
        model: model ?? undefined,
        promptTokens: prompt,
        completionTokens,
        cachedInputTokens: cached,
      };
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
      enableStreamUsage(init);
    },
    extract: async (resp) => {
      const payload = await readOpenAiUsage(resp);
      if (!payload) return null;
      const { usage, model } = payload;
      const { prompt, cached } = splitCachedInput(usage);
      const completionTokens = usage.completion_tokens ?? usage.output_tokens ?? 0;
      const reasoning = usage.completion_tokens_details?.reasoning_tokens ?? 0;
      const costUsd = computeCost(model, prompt + cached, completionTokens);
      return {
        costUsd,
        model: model ?? undefined,
        promptTokens: prompt,
        completionTokens,
        cachedInputTokens: cached,
        reasoningTokens: reasoning,
      };
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
      const payload = await readAnthropicUsage(resp);
      if (!payload) return null;
      const { usage, model } = payload;
      const promptTokens = usage.input_tokens ?? 0;
      const cached = usage.cache_read_input_tokens ?? 0;
      const cacheWrite = usage.cache_creation_input_tokens ?? 0;
      const completionTokens = usage.output_tokens ?? 0;
      const costUsd = computeCost(
        model,
        promptTokens + cached + cacheWrite,
        completionTokens,
      );
      return {
        costUsd,
        model: model ?? undefined,
        promptTokens,
        completionTokens,
        cachedInputTokens: cached,
        cacheWriteTokens: cacheWrite,
      };
    },
  },
  {
    name: "gemini",
    match: (u) =>
      u.includes("generativelanguage.googleapis.com") ||
      u.includes("aiplatform.googleapis.com"),
    extract: async (resp) => {
      const payload = await readGeminiUsage(resp);
      if (!payload) return null;
      const { usage, model } = payload;
      const totalPrompt =
        usage.promptTokenCount ?? usage.prompt_token_count ?? usage.promptTokens ?? 0;
      const cached =
        usage.cachedContentTokenCount ?? usage.cached_content_token_count ?? 0;
      const completionTokens =
        usage.candidatesTokenCount ??
        usage.candidates_token_count ??
        usage.completionTokens ??
        usage.outputTokenCount ??
        0;
      const reasoning = usage.thoughtsTokenCount ?? usage.thoughts_token_count ?? 0;
      const costUsd = computeCost(model, totalPrompt, completionTokens);
      return {
        costUsd,
        model: model ?? undefined,
        promptTokens: Math.max(0, totalPrompt - cached),
        completionTokens,
        cachedInputTokens: cached,
        reasoningTokens: reasoning,
      };
    },
  },
  {
    name: "perplexity",
    match: (u) => u.includes("api.perplexity.ai"),
    enhance: (init) => {
      enableStreamUsage(init);
    },
    extract: async (resp) => {
      const payload = await readOpenAiUsage(resp);
      if (!payload) return null;
      const { usage, model } = payload;
      const { prompt, cached } = splitCachedInput(usage);
      const completionTokens = usage.completion_tokens ?? 0;
      const explicit = usage.cost?.total_cost;
      const costUsd =
        typeof explicit === "number"
          ? explicit
          : computeCost(model, prompt + cached, completionTokens);
      return {
        costUsd,
        model: model ?? undefined,
        promptTokens: prompt,
        completionTokens,
        cachedInputTokens: cached,
      };
    },
  },
  {
    name: "cloro",
    match: (u) => u.includes("api.cloro.dev"),
    extract: async (resp) => {
      try {
        if (/\/async\/task\/?$/i.test(new URL(resp.url).pathname)) return null;
      } catch {
        /* */
      }
      const j: any = await resp.clone().json().catch(() => null);
      const credits = j?.credits?.creditsCharged ?? j?.credits?.creditsToCharge;
      const taskType = j?.task?.taskType ?? j?.result?.taskType;
      const sync = CLORO_SYNC_ENDPOINTS.find((s) => s.match.test(resp.url));
      const model =
        typeof taskType === "string" ? taskType.toLowerCase() : (sync?.model ?? null);
      if (typeof credits === "number") {
        return { costUsd: cloroCreditsToUsd(credits), model: model ?? undefined };
      }
      if (!sync || !resp.ok) return null;
      return { costUsd: cloroCreditsToUsd(sync.credits), model: sync.model };
    },
  },
  {
    name: "fal",
    match: (u) => u.includes("fal.run"),
    extract: async (resp) => {
      if (!resp.ok) return null;
      const j: any = await resp.clone().json().catch(() => null);
      const images = Array.isArray(j?.images) && j.images.length > 0 ? j.images.length : 1;
      let model: string | null = null;
      try {
        model = new URL(resp.url).pathname.replace(/^\//, "") || null;
      } catch {
        /* */
      }
      return {
        costUsd: Math.round(images * FAL_IMAGE_USD * 1_000_000) / 1_000_000,
        model: model ?? undefined,
      };
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
