# @viewengine/track

One install, one wrapper line, and every provider fetch your app makes (OpenAI, Anthropic, Gemini, OpenRouter, Perplexity, Fal, Zyte, DataForSEO, Apify, Firecrawl, BrightData, …) is auto-attributed to your app, your Clerk org, your end user, and the action they were doing — live on your dashboard at [track.viewengine.ai](https://track.viewengine.ai).

This README is the integration guide. For pricing internals, architecture, dashboard, self-host, and version history, see the [CHANGELOG](./CHANGELOG.md).

- [Quick start](#quick-start)
- [Core API](#core-api)
- [Patterns by worker shape](#patterns-by-worker-shape)
- [Tagging work with actions](#tagging-work-with-actions)
- [Manual events](#manual-events)
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
| `trackCredits(input)` | Report a credit deduction (e.g. from Autumn's `track`) so credit usage shows up per app/action/user/org on the dashboard. See [Manual events](#manual-events). |
| `withUser({ userId, orgId }, fn)` | Override user/org for a block. Rare. |
| `flush()` | Ship buffered events now. Call at phase boundaries of long-running scopes (crons) so a killed isolate cannot take the buffer with it. See [Long-running scopes](#long-running-scopes-flush-between-phases). |
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

**Flat-plan providers belong here, not in `src/providers.ts`.** If you pay a fixed monthly fee for an allowance rather than per call, the dollar value of one unit depends on your plan, which the SDK cannot know and which changes whenever you upgrade. Keep the plan rate in your app as the single source of truth and report `costUsd` yourself. A rate hardcoded in the SDK goes stale silently and mis-states every call that uses it.

The same applies when the response that reveals the cost is not the response to your own fetch — an async job whose result arrives by inbound webhook, say. The fetch hook only sees outbound calls, so book the cost from wherever your app learns it, once, at a point you can guarantee runs exactly once.

### Long-running scopes: flush between phases

Events buffer in memory and ship once, at the end of the scope. That is right for a request and wrong for a cron that runs for minutes: if the isolate is killed (platform wall clock, OOM) the end-of-scope flush never runs and the whole buffer is lost. Anything you gated on a database write will never be re-emitted.

Call `flush()` at each phase boundary of a long job:

```ts
import { flush } from "@viewengine/track";

for (const phase of phases) {
  await phase.run();
  await flush();   // the preceding phase's events are now durable
}
```

It no-ops outside a scope and on an empty buffer, so it is safe to leave in. As a backstop, the SDK also flushes automatically once 50 events are buffered.

### Correlating events with your own records

Pass `correlationId` on `trackUsage` or `trackCredits` to store your own id (a job id, task id, or row id) alongside the event:

```ts
trackUsage({ provider: "acme", costUsd: 0.0031, correlationId: task.id });
```

The dashboard indexes it per tenant, so you can join ve-track events back to your database and prove the two agree.

### Credits

If your app bills users in credits (we use [Autumn](https://useautumn.com)), report each deduction with `trackCredits` right after the billing call succeeds. The dashboard then shows credit usage per app, action, user, org, provider, and model, alongside cost:

```ts
import { trackCredits } from "@viewengine/track";

const result = await autumn.track({
  customerId: user.id,
  featureId: "ai_search",
  value: 3,
});

trackCredits({
  credits: 3,          // required — credits deducted
  action: "ai_search", // defaults to the current scope's action
  creditPriceUsd: 0.01, // optional — powers revenue/profitability
});
```

Standalone credit events are recorded under provider `"autumn"` (override with `provider`). To attach credits to the same event as the provider call that caused them, pass `creditsCharged` / `creditPriceUsd` to `trackUsage` instead — that's what feeds `/api/v1/breakdown/profitability`. Like `trackUsage`, `trackCredits` is a silent no-op outside a scope.

**Default credit price.** If your organization charges the same credit price across all its apps, set it once in the dashboard under **Settings → Credits → Default credit price** and omit `creditPriceUsd` everywhere. Any credit event that arrives without a price is stamped with the default at ingest. Pass `creditPriceUsd` only in apps with their own unique pricing — an explicit value always wins over the default. Events ingested before a default is set stay unpriced.

---

## Configuration

`trackHandler<E>(config, handler)` — `config` accepts:

| Field | Type | Default | Notes |
|---|---|---|---|
| `app` | `string` | required | Identifier shown on the dashboard. Pick a stable slug like `ve-fanout`, `ve-rank`. |
| `apiKey` | `string \| (env) => string \| undefined` | `env.VE_TRACK_KEY` | Override if your secret is named something else. |
| `baseUrl` | `string` | `env.VE_TRACK_BASE_URL` or `https://track.viewengine.ai` | Point at staging or a self-hosted instance. |
| `resolveUser` | `"clerk"` \| `"none"` \| custom function | `"clerk"` | Default resolves the Clerk session (bearer token, or session cookie when `CLERK_PUBLISHABLE_KEY` is set). Pass a custom resolver for other auth, or `"none"` to disable user attribution. |
| `maxExtractBytes` | `number` | unlimited | Skip usage extraction for provider responses whose `Content-Length` exceeds this many bytes. The event is still recorded with latency and status, just without token/cost detail. Bounds transient memory when very large provider payloads run at high concurrency. |

**Resolution is lazy.** The resolver runs at most once per request, and only when the request actually records a tracked event (a matched provider fetch, `trackUsage`, or `trackCredits`). Requests that never touch a provider pay zero resolution cost. If your app already verifies auth in middleware, pass a custom `resolveUser` that reads your existing auth context instead of verifying the token a second time.

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

With the default `resolveUser: "clerk"`, the SDK attributes events to the signed in Clerk user and org (`org_id` claim, or the `X-Organization-Id` header as fallback). If any step fails the request still runs — the event just isn't user-attributed. Which credentials it reads depends on the env vars you expose:

| Env vars present | Behavior |
|---|---|
| `CLERK_SECRET_KEY` only | Verifies the `Authorization: Bearer <token>` header. Cookie-authenticated page requests are **not** attributed. |
| `CLERK_SECRET_KEY` + `CLERK_PUBLISHABLE_KEY` | Full session resolution via Clerk's `authenticateRequest` — handles both bearer tokens and session cookies. Use this for SSR apps where page loads authenticate via cookies. |
| `CLERK_JWT_KEY` (with either of the above) | Verification becomes a local signature check against the PEM public key — no network round trip to Clerk's JWKS endpoint, even on cold isolates. Recommended for latency-sensitive Workers. |

For **queue messages**, the producer stamps `body.auth = { userId, orgId }` on the message and `trackMessage` picks it up.
