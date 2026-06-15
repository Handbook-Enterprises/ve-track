# @viewengine/track

Cost-attribution SDK + service for AI-shaped apps. One install, one wrapper line, every provider fetch auto-attributed to your app, your Clerk org, your end user, **and the action they were doing** — visible on a live dashboard at [track.viewengine.ai](https://track.viewengine.ai) within seconds.

- **SDK** (this repo's root) — drop into any Cloudflare Worker, Node, Bun, or Deno app.
- **Service** ([`/service`](./service)) — the worker that ingests events, stores them in D1, and renders the dashboard.

> **Status:** v0.2 · self-hosted on Cloudflare Workers · used internally at ViewEngine.

---

## Table of contents

1. [60-second quick start](#60-second-quick-start)
2. [The core API](#the-core-api)
3. [Patterns by worker shape](#patterns-by-worker-shape)
4. [Tagging your work with actions](#tagging-your-work-with-actions)
5. [Manual events](#manual-events)
6. [Configuration](#configuration)
7. [Providers + what gets captured](#providers--what-gets-captured)
8. [How users + orgs are identified](#how-users--orgs-are-identified)
9. [Dashboard concepts](#dashboard-concepts)
10. [Architecture](#architecture)
11. [Self-host the service](#self-host-the-service)
12. [Local development](#local-development)

---

## 60-second quick start

### 1. Install

```bash
bun add github:Handbook-Enterprises/ve-track
# or: npm install github:Handbook-Enterprises/ve-track
```

### 2. Issue a key

Sign in to [track.viewengine.ai/dashboard/keys](https://track.viewengine.ai/dashboard/keys), click **New key**, copy the `vt_live_…` value.

### 3. Add two env vars

In your worker's `.dev.vars` (and as secrets in production):

```ini
VE_TRACK_KEY=vt_live_xxxxxxxxxxxxxxxxxxxxxxxx
VE_TRACK_BASE_URL=https://track.viewengine.ai
```

### 4. Wrap your handler

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

That's it. Every external provider fetch your worker makes (OpenAI, Anthropic, Gemini, OpenRouter, Perplexity, Cloro, Fal, Zyte, DataForSEO, Apify, Firecrawl, BrightData, …) is now intercepted, priced, attributed to the signed-in Clerk user/org, and shipped to your dashboard.

> Don't have a Clerk app? Pass `resolveUser: "none"` to disable user attribution.

---

## The core API

All you ever need to import:

| Symbol | What it does |
|---|---|
| `trackHandler(config, handler)` | Wraps your `ExportedHandler` (`fetch` / `queue` / `scheduled` / `email`) so every internal provider fetch becomes a tracked event. **The only required call.** |
| `trackMessage(message, fn)` | Inside a queue handler, scopes a single message under its body's `auth` + `action`. Reads `body.auth.userId`, `body.auth.orgId`, `body.action` automatically. |
| `trackAction(label, fn)` | Tags an arbitrary block of work with an action label. Useful when one HTTP request runs multiple distinct actions. |
| `trackUsage(usage)` | Manually emit one event from inside a scope. The escape hatch for a provider the lib doesn't auto-detect, or a cost you compute yourself. See [Manual events](#manual-events). |
| `withUser({ userId, orgId }, fn)` | Override user/org for a block. Rare. |
| `getCurrentScope()` | Inspect what's currently being tracked. Debugging-only. |

Power users can also pull `trackedHandler`, `runScope`, `installFetchHook`, `clerkUserResolver`, `RequestScope`, the raw `PROVIDERS` table, and the `cloroCreditsToUsd` helper — but you almost certainly don't need those.

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

Each request runs under a scope tagged with the Clerk user/org from the bearer token. Provider fetches inside the request handler are tracked.

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

`trackMessage` reads those fields automatically. No magic, no extra wiring.

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

Cron ticks are tracked as `action: "scheduled"` by default; wrap with `trackAction` to give them a real name.

### D. Worker with email triggers

```ts
trackHandler<Env>(
  { app: "support" },
  { email: async (msg, env, ctx) => handleEmail(msg, env) },
);
```

Email-triggered runs are tracked as `action: "email"` by default.

---

## Tagging your work with actions

**Why it matters:** the dashboard's "Cost per action" board on the overview page is the single most useful number for setting credit prices. *"Each `ai-search` run costs $0.014 on average."* That's exactly what you charge for.

Three ways to tag, listed by precedence:

1. **Per queue message** — set `body.action` on the message:
   ```ts
   env.MY_QUEUE.send({ ...payload, action: "ai-search" });
   ```
2. **Per HTTP block** — wrap the work with `trackAction`:
   ```ts
   await trackAction("ai-search", async () => {
     await openai.chat.completions.create(...);
   });
   ```
3. **Worker-shape default** — if you don't tag at all, `trackHandler` falls back to `"queue"` / `"scheduled"` / `"email"` based on the entry point.

You can mix them: a `trackMessage(...)` inside a queue handler can contain a `trackAction(...)` if a single message spawns multiple distinct actions.

---

## Manual events

Auto-interception covers every provider in the table below. When you hit something the lib doesn't recognize, or you already know the cost and want to record it yourself, call `trackUsage` from inside any tracked scope:

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

It inherits the current scope's `app`, user, org, and `action` — override any of them per call (`action`, `userId`, `orgId`). The event joins the same per-request buffer and flushes with everything else. Outside a scope it's a silent no-op, so it's safe to leave in.

When the provider is one you'll hit repeatedly, prefer adding it to `src/providers.ts` (one entry, see [Providers](#providers--what-gets-captured)) so it's captured automatically everywhere instead of by hand at each call site.

---

## Configuration

`trackHandler<E>(config, handler)` — `config` accepts:

| Field | Type | Default | Notes |
|---|---|---|---|
| `app` | `string` | required | Identifier shown on the dashboard. Pick a stable slug like `ve-fanout`, `ve-rank`, `ve-index`. |
| `apiKey` | `string \| (env) => string \| undefined` | `env.VE_TRACK_KEY` | Override if your secret is named something else. |
| `baseUrl` | `string` | `env.VE_TRACK_BASE_URL` or `https://track.viewengine.ai` | Point at staging or a self-hosted instance. |
| `resolveUser` | `"clerk"` \| `"none"` \| custom function | `"clerk"` | The default reads the Clerk session bearer token. Pass a custom resolver for other auth providers, or `"none"` to disable user attribution. |

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

## Providers + what gets captured

Built-in matchers and how cost is computed (model-table → token math, fallback to provider-reported cost):

| Provider | Domain match | Cost source |
|---|---|---|
| OpenAI | `api.openai.com` | model + token count → priced from in-lib table (gpt-5, gpt-4o, gpt-4.1, gpt-3.5, o3, …) |
| Anthropic | `api.anthropic.com` | same — claude-opus-4, claude-sonnet-4-x, claude-haiku-4-5, claude-3-* |
| Google Gemini | `generativelanguage.googleapis.com`, `aiplatform.googleapis.com` | same — gemini-2.5-pro/flash/flash-lite, gemini-1.5-* |
| OpenRouter | `openrouter.ai/api` | uses OpenRouter's `usage.cost` if present, falls back to model table |
| Perplexity | `api.perplexity.ai` | `usage.cost.total_cost` if present, else model table (sonar, sonar-pro, sonar-reasoning, sonar-deep-research) |
| Cloro | `api.cloro.dev` | `credits.creditsCharged` → USD at $0.04/credit; flat credit cost for sync monitor endpoints; async submit acks skipped |
| Fal | `fal.run` | $0.01 per returned image; model = endpoint path |
| Zyte | `api.zyte.com` | `Zyte-Request-Cost` header, then body, then $0.001 floor |
| DataForSEO | `api.dataforseo.com` | `tasks[0].cost` field |
| Apify | `api.apify.com` | `data.usageTotalUsd` |
| Firecrawl | `api.firecrawl.dev` | credits used (cost = 0; credits stored on `prompt_tokens`) |
| BrightData | `brightdata.com`, `luminati.io` | flat $0.0015 per request |

Each event captures: timestamp, app, clerk_user_id, clerk_org_id, **action**, provider, model, prompt_tokens, completion_tokens, latency_ms, cost_usd, status_code.

**Adding a new provider** is one entry in `src/providers.ts` — match URL, optionally enhance request, extract `{ costUsd, model?, promptTokens?, completionTokens? }` from the response.

---

## How users + orgs are identified

`trackHandler` defaults to `clerkUserResolver`, which:

1. Reads the `Authorization: Bearer <token>` header from the request.
2. `verifyToken(token, { secretKey: env.CLERK_SECRET_KEY })` to get the `sub` (user) and `org_id` claim.
3. Falls back to the `X-Organization-Id` header if the token has no org claim.
4. Returns `{ userId: null, orgId: null }` if any step fails — the request still runs, the event just isn't user-attributed.

For queue messages, the producer is responsible for stamping `body.auth = { userId, orgId }` on the message. `trackMessage` picks it up.

The dashboard then resolves IDs to names via `@clerk/backend` server-side, so the UI shows *"Sylvester · sylvester@viewengine.ai"* instead of `user_3C5DLG5R…`.

---

## Dashboard concepts

The dashboard at `/dashboard` has three pages:

- **Overview** — total spend with WoW delta, cost-per-action board (the credit-pricing input), top apps / providers / orgs.
- **Usage** — full attribution. Switch dimension between **By Action** (default), App, Organization, Person, Provider, Model. Powered by TanStack Table — sortable, filterable.
- **Keys** — issue, rotate, revoke API keys.

The headline number you'll care about the most: on the Usage page's **By Action** tab, the top callout shows *"action_name · $0.014 avg/run · 12 runs · 38% of spend"*. That avg/run is what you base credit prices on.

---

## Architecture

```
your-app (worker)                      ve-track service (worker)
┌─────────────────────────────┐        ┌──────────────────────────────────┐
│ trackHandler                │        │ POST /api/v1/events              │
│  ├─ patches global fetch    │ POST → │  → validate api key (x-ve-key)   │
│  ├─ scope = AsyncLocalStor. │        │  → derive tenant_id              │
│  └─ on every provider fetch:│        │  → batch insert into D1          │
│      capture model, tokens, │        └──────────────────────────────────┘
│      cost, latency          │                       │
│  → flush at end of request  │                       │
└─────────────────────────────┘             D1: tenants, api_keys,
                                              usage_events (action col)
                                                       │
                                            ┌──────────▼──────────┐
                                            │ /dashboard          │
                                            │ Clerk session →     │
                                            │ tenant_id → groupBy │
                                            └─────────────────────┘
```

Key invariants:

- **Per-request buffer.** Every event a request generates lives in an `AsyncLocalStorage`-bound scope until `runScope`'s `finally` block awaits all pending extracts and flushes the buffer in a single POST.
- **Tenant scoping.** Every API key is bound to a tenant (a Clerk org). Every event read on the dashboard filters by the dashboard user's tenant. No cross-tenant leakage.
- **Cost is a derived number.** The lib computes cost from `model + tokens` against an in-lib pricing table, OR from the provider's reported cost (Zyte, DataForSEO, Apify), whichever is available. Cost is not user-supplied.

---

## Self-host the service

Everything you need is in [`/service`](./service). Cloudflare Workers + D1 + React Router 7 + Clerk + Tailwind v4. Deploy with `cd service && wrangler deploy`. Migrations under `service/backend/migrations`. Frontend under `service/app`.

---

## Local development

In the SDK repo:

```bash
bun install
bun run typecheck
```

In the service:

```bash
cd service
cp .dev.vars.example .dev.vars  # fill in CLERK_SECRET_KEY etc.
bun run dev                      # http://127.0.0.1:5174
```

Issue a key from the local dashboard, paste it into your consuming app's `.dev.vars` as `VE_TRACK_KEY`, set `VE_TRACK_BASE_URL=http://127.0.0.1:5174`, and start firing events.
