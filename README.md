# @viewengine/track

One install, one wrapper line, and every provider fetch your app makes (OpenAI, Anthropic, Gemini, OpenRouter, Perplexity, Cloro, Fal, Zyte, DataForSEO, Apify, Firecrawl, BrightData, …) is auto-attributed to your app, your Clerk org, your end user, and the action they were doing — live on your dashboard at [track.viewengine.ai](https://track.viewengine.ai).

This README is the integration guide. For pricing internals, architecture, dashboard, self-host, and version history, see the [CHANGELOG](./CHANGELOG.md).

- [Quick start](#quick-start)
- [Core API](#core-api)
- [Patterns by worker shape](#patterns-by-worker-shape)
- [Tagging work with actions](#tagging-work-with-actions)
- [Manual events](#manual-events)
- [Credits](#credits)
- [Configuration](#configuration)
- [Providers](#providers)
- [Identifying users + orgs](#identifying-users--orgs)

---

## Quick start

**1. Install**

```bash
bun add github:Handbook-Enterprises/ve-track
# or: npm install github:Handbook-Enterprises/ve-track
```

**2. Issue a key** at [track.viewengine.ai/dashboard/keys](https://track.viewengine.ai/dashboard/keys) — click **New key**, copy the `vt_live_…` value.

**3. Add two env vars** to your worker's `.dev.vars` (and as secrets in production):

```ini
VE_TRACK_KEY=vt_live_xxxxxxxxxxxxxxxxxxxxxxxx
VE_TRACK_BASE_URL=https://track.viewengine.ai
```

**4. Wrap your handler**

```ts
import { trackHandler } from "@viewengine/track";
import app from "./api";

export default trackHandler<Env>(
  { app: "my-app" },
  {
    fetch: (req, env, ctx) => app.fetch(req, env, ctx),
  },
);
```

That's it. Every external provider fetch is now intercepted, priced, attributed to the signed-in Clerk user/org, and shipped to your dashboard within seconds.

> No Clerk app? Pass `resolveUser: "none"` to disable user attribution.

---

## Core API

| Symbol | What it does |
|---|---|
| `trackHandler(config, handler)` | Wraps your `ExportedHandler` (`fetch` / `queue` / `scheduled` / `email`) so every internal provider fetch becomes a tracked event. **The only required call.** |
| `trackMessage(message, fn)` | Inside a queue handler, scopes a single message under its body's `auth` + `action`. Reads `body.auth.userId`, `body.auth.orgId`, `body.action` automatically. |
| `trackAction(label, fn)` | Tags a block of work with an action label. Useful when one HTTP request runs multiple distinct actions. |
| `trackUsage(usage)` | Manually emit one event from inside a scope — for a provider the lib doesn't auto-detect, or a cost you compute yourself. See [Manual events](#manual-events). |
| `trackCredits({ credits, priceUsd? })` | Record credits charged to the customer for this action, on the same correlation as its provider costs. Always pass `priceUsd` so revenue and margin compute. See [Credits](#credits). |
| `withCorrelation(id, fn)` | Run a block under an explicit correlation id so its provider costs and credits reconcile as one action. |
| `withUser({ userId, orgId }, fn)` | Override user/org for a block. Rare. |
| `getCurrentScope()` | Inspect what's currently being tracked. Debugging only. |

---

## Patterns by worker shape

### A. Plain HTTP worker

```ts
import { trackHandler } from "@viewengine/track";
import app from "./api";

export default trackHandler<Env>(
  { app: "my-app" },
  { fetch: (req, env, ctx) => app.fetch(req, env, ctx) },
);
```

Each request runs under a scope tagged with the Clerk user/org from the bearer token. Provider fetches inside the handler are tracked.

### B. Worker with a queue

```ts
import { trackHandler, trackMessage } from "@viewengine/track";

export default trackHandler<Env>(
  { app: "my-app" },
  {
    fetch: (req, env, ctx) => app.fetch(req, env, ctx),
    queue: async (batch, env, ctx) => {
      await Promise.all(
        batch.messages.map((message) =>
          trackMessage(message, async () => {
            await processOne(message.body, env);
          }),
        ),
      );
    },
  },
);
```

**Producer side** — when sending the message, attach `auth` + `action`:

```ts
await env.MY_QUEUE.send({
  ...payload,
  auth: { userId: c.get("auth")?.userId, orgId: c.get("auth")?.orgId },
  action: "rank-refresh",
});
```

`trackMessage` reads those fields automatically.

### C. Worker with scheduled (cron) work

```ts
import { trackHandler, trackAction } from "@viewengine/track";

export default trackHandler<Env>(
  { app: "my-app" },
  {
    scheduled: async (controller, env, ctx) => {
      await trackAction("nightly-rebuild", async () => {
        await rebuildEverything(env);
      });
    },
  },
);
```

Cron ticks default to `action: "scheduled"`; wrap with `trackAction` to name them.

### D. Worker with email triggers

```ts
trackHandler<Env>(
  { app: "support" },
  { email: async (msg, env, ctx) => handleEmail(msg, env) },
);
```

Email-triggered runs default to `action: "email"`.

---

## Tagging work with actions

Tagging lets the dashboard tell you what each kind of run costs (`ai-search · $0.014 avg/run`) — the number you base credit prices on. Three ways, by precedence:

1. **Per queue message** — set `body.action`:
   ```ts
   env.MY_QUEUE.send({ ...payload, action: "ai-search" });
   ```
2. **Per HTTP block** — wrap with `trackAction`:
   ```ts
   await trackAction("ai-search", async () => {
     await openai.chat.completions.create(...);
   });
   ```
3. **Worker-shape default** — untagged work falls back to `"queue"` / `"scheduled"` / `"email"` based on the entry point.

You can mix them: a `trackMessage(...)` can contain a `trackAction(...)` if one message spawns multiple actions.

---

## Manual events

When you hit a provider the lib doesn't recognize, or you already know the cost, call `trackUsage` from inside any tracked scope:

```ts
import { trackUsage } from "@viewengine/track";

const res = await fetch("https://api.some-new-provider.com/run", { ... });
const body = await res.json();

trackUsage({
  provider: "some-new-provider",
  costUsd: body.cost,
  model: body.model,
  promptTokens: body.usage?.input,
  completionTokens: body.usage?.output,
  latencyMs: 142,
  statusCode: res.status,
});
```

It inherits the current scope's `app`, user, org, and `action` — override any per call. Outside a scope it's a silent no-op, so it's safe to leave in. For a provider you hit repeatedly, add it to `src/providers.ts` instead (see [Providers](#providers)).

---

## Credits

Every tracked event now carries three credit fields alongside its cost: `credits_charged`, `credit_price_usd_at_event`, and `correlation_id`. Provider fetches leave credits null and inherit the scope's correlation id, so the dashboard can reconcile what an action **cost** us against what it **charged** the customer, per action.

Each scope gets a correlation id automatically (a fresh one per `trackAction` / `trackMessage`), so a single action's provider fetches already share one id. Record the credits you charged from inside that same scope:

```ts
import { trackCredits } from "@viewengine/track";

await trackAction("rank-refresh", async () => {
  await runRankCheck(env);       // provider fetches auto-tracked under this correlation
  trackCredits({ credits: 1, priceUsd: 0.01 });
});
```

To tie a queue message to the request that produced it, pass `correlationId` on the message body (`trackMessage` reads it automatically), or wrap any block with `withCorrelation(id, fn)`.

`trackCredits` is currently the **only** way charges reach the credit ledger — the app computes the charge and reports it. Always pass `priceUsd`: revenue on the Credits dashboard is `credits × priceUsd`, so omitting it records the credits with zero revenue and a meaningless margin. A server-side rate card (`credit_pricing`, keyed by app + action) that computes credits automatically from the provider events you already send is planned but not live yet.

---

## Configuration

`trackHandler<E>(config, handler)` — `config` accepts:

| Field | Type | Default | Notes |
|---|---|---|---|
| `app` | `string` | required | Identifier shown on the dashboard. Pick a stable slug like `ve-fanout`, `ve-rank`. |
| `apiKey` | `string \| (env) => string \| undefined` | `env.VE_TRACK_KEY` | Override if your secret is named something else. |
| `baseUrl` | `string` | `env.VE_TRACK_BASE_URL` or `https://track.viewengine.ai` | Point at staging or a self-hosted instance. |
| `resolveUser` | `"clerk"` \| `"none"` \| custom function | `"clerk"` | Default reads the Clerk session bearer token. Pass a custom resolver for other auth, or `"none"` to disable user attribution. |

**Custom resolver shape:**

```ts
trackHandler<Env>(
  {
    app: "my-app",
    resolveUser: async (req, env) => ({
      userId: parseSessionCookie(req)?.userId ?? null,
      orgId: parseSessionCookie(req)?.tenantId ?? null,
    }),
  },
  { fetch: ... },
);
```

---

## Providers

These domains are auto-detected and priced for you — no config:

| Provider | Domain match |
|---|---|
| OpenAI | `api.openai.com` |
| Anthropic | `api.anthropic.com` |
| Google Gemini | `generativelanguage.googleapis.com`, `aiplatform.googleapis.com` |
| OpenRouter | `openrouter.ai/api` |
| Perplexity | `api.perplexity.ai` |
| Cloro | `api.cloro.dev` |
| Fal | `fal.run` |
| Zyte | `api.zyte.com` |
| DataForSEO | `api.dataforseo.com` |
| Apify | `api.apify.com` |
| Firecrawl | `api.firecrawl.dev` |
| BrightData | `brightdata.com`, `luminati.io` |

Token-based LLMs are priced server-side from a live catalog; the rest use the cost the provider reports. (Details in the [CHANGELOG](./CHANGELOG.md#reference).)

**Add a provider** with one entry in `src/providers.ts` — match the URL, optionally enhance the request, and extract `{ costUsd, model?, promptTokens?, completionTokens?, cachedInputTokens?, cacheWriteTokens?, reasoningTokens? }` from the response.

---

## Identifying users + orgs

With the default `resolveUser: "clerk"`, the SDK reads the `Authorization: Bearer <token>` header, verifies it with `env.CLERK_SECRET_KEY`, and attributes the event to that user and org (`org_id` claim, or the `X-Organization-Id` header as fallback). If any step fails the request still runs — the event just isn't user-attributed.

For **queue messages**, the producer stamps `body.auth = { userId, orgId }` on the message and `trackMessage` picks it up.
