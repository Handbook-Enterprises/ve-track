import type { Provider } from "./types";

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
      return {
        costUsd: j.usage.cost ?? 0,
        model: j.model,
        promptTokens: j.usage.prompt_tokens,
        completionTokens: j.usage.completion_tokens,
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
    },
    extract: async (resp) => {
      const j: any = await resp.clone().json().catch(() => null);
      if (!j?.usage) return null;
      return {
        costUsd: 0,
        model: j.model,
        promptTokens: j.usage.prompt_tokens,
        completionTokens: j.usage.completion_tokens,
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
      const j: any = await resp.clone().json().catch(() => null);
      if (!j?.usage) return null;
      return {
        costUsd: 0,
        model: j.model,
        promptTokens: j.usage.input_tokens,
        completionTokens: j.usage.output_tokens,
      };
    },
  },
  {
    name: "zyte",
    match: (u) => u.includes("api.zyte.com"),
    extract: async (resp) => {
      const cost = parseFloat(resp.headers.get("Zyte-Request-Cost") ?? "0");
      return cost > 0 ? { costUsd: cost } : null;
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
];
