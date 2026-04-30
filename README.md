# @viewengine/track

Cost-attribution SDK + service for AI-shaped apps. One install, one wrapper line, every provider fetch auto-attributed to your app, your Clerk org, and your end user — visible on a live dashboard within seconds.

- **SDK** (this repo's root) — drop into any Cloudflare Worker, Node, Bun, or Deno app.
- **Service** ([`/service`](./service)) — the worker that ingests events, stores them in D1, and renders the dashboard at `track.viewengine.ai`.

> **Status:** v0.1 · self-hosted on Cloudflare Workers · used internally at ViewEngine.

---

## Table of contents

1. [Quick start](#quick-start) — install + wrap your handler
2. [Configuration](#configuration)
3. [Providers + what gets captured](#providers--what-gets-captured)
4. [Auth model](#auth-model)
5. [API reference](#api-reference)
6. [Architecture](#architecture)
7. [Self-host the service](#self-host-the-service)
8. [Local development](#local-development)
9. [Releasing the SDK](#releasing-the-sdk)
10. [Deploy CI/CD](#deploy-cicd)

---

## Quick start

### 1. Install

```bash
bun add github:Handbook-Enterprises/ve-track
```

Pin to a release:

```bash
bun add github:Handbook-Enterprises/ve-track#v0.1.0
```

### 2. Get an API key

Sign in to [track.viewengine.ai](https://track.viewengine.ai) with the Google account that owns the app. A tenant is auto-provisioned. Go to **API Keys → Create key**, label it (`ve-fanout production`), copy the full key — it's the only time it's shown.

The key looks like `vt_live_AbCd1234…`.

### 3. Wrap your worker handler

```ts
// apps/backend/src/index.ts
import { trackedHandler, clerkUserResolver } from "@viewengine/track";
import app from "./api/app";

export default trackedHandler<Env>({
  app: "ve-fanout",
  resolveUser: clerkUserResolver,
  fetch: (req, env, ctx) => app.fetch(req, env, ctx),
});
```

Add the key to the worker's env:

```jsonc
// wrangler.jsonc
"keep_vars": true,
"vars": {
  "VE_APP": "ve-fanout"
}
```

```bash
# .dev.vars (local) — for production, use `wrangler secret put VE_TRACK_KEY`
VE_TRACK_KEY=vt_live_AbCd1234…
```

That's the full integration. Every `fetch()` to a known provider made anywhere inside your handler is auto-attributed and shipped to ve-track. Your existing code does not change.

---

## Configuration

`trackedHandler<Env>(config)` accepts:

| Field | Required | Default | Description |
| --- | --- | --- | --- |
| `app` | yes | — | Free-form label for this app inside your tenant. Shows up in the **Per App** breakdown. |
| `apiKey` | indirect | `(env) => env.VE_TRACK_KEY` | Override the env-var lookup, e.g. `(env) => env.MY_CUSTOM_KEY`. |
| `baseUrl` | no | `env.VE_TRACK_BASE_URL` ?? `https://track.viewengine.ai` | Point at a self-hosted ve-track. |
| `resolveUser` | no | `() => ({ userId: null, orgId: null })` | Pass `clerkUserResolver` (built-in, lazy-imports `@clerk/backend`) or write your own `(req, env) => Promise<{ userId, orgId }>`. |
| `fetch` | yes | — | Your existing fetch handler. |
| `scheduled` / `queue` / `email` / `tail` / `trace` | no | — | Pass-through to the underlying `ExportedHandler`. |

### With Sentry

Sentry wraps from outside `trackedHandler`:

```ts
import * as Sentry from "@sentry/cloudflare";
import { trackedHandler, clerkUserResolver } from "@viewengine/track";
import app from "./api/app";

const handler = trackedHandler<Env>({
  app: "ve-fanout",
  resolveUser: clerkUserResolver,
  fetch: (req, env, ctx) => app.fetch(req, env, ctx),
  queue: async (batch, env) => { /* your existing queue handler */ },
});

export default Sentry.withSentry((env) => ({ dsn: env.SENTRY_DSN, /* ... */ }), handler);
```

### Without Clerk

```ts
import { trackedHandler } from "@viewengine/track";

export default trackedHandler<Env>({
  app: "my-app",
  resolveUser: async (req) => {
    const userId = req.headers.get("x-user-id") ?? null;
    return { userId, orgId: null };
  },
  fetch: (req, env, ctx) => app.fetch(req, env, ctx),
});
```

---

## Providers + what gets captured

| Provider | Match | Attribution mutation | Extracted from response |
| --- | --- | --- | --- |
| **OpenRouter** | `openrouter.ai/api` | `X-OpenRouter-Title: <app>` header + `user: <userId>` body | `usage.cost`, `model`, `usage.prompt_tokens`, `usage.completion_tokens` |
| **OpenAI** | `api.openai.com` | `user: <userId>` body | `model`, `usage.prompt_tokens`, `usage.completion_tokens` (cost computed later) |
| **Anthropic** | `api.anthropic.com` | `metadata.user_id: <userId>` body | `model`, `usage.input_tokens`, `usage.output_tokens` (cost computed later) |
| **Zyte** | `api.zyte.com` | — | `Zyte-Request-Cost` response header |
| **DataForSEO** | `api.dataforseo.com` | — | `cost` (or `tasks[0].cost`) from JSON |
| **Apify** | `api.apify.com` | — | `usageTotalUsd` from JSON |
| **Firecrawl** | `api.firecrawl.dev` | — | `creditsUsed` from JSON |

Streaming (`text/event-stream`) responses are skipped for extraction — we only log latency + status code on those.

Add a provider by appending one entry to [`src/providers.ts`](./src/providers.ts).

### Privacy

Request bodies are mutated **only** for attribution fields above. Request and response bodies are **never** sent to ve-track — only the extracted usage fields (cost, tokens, model, latency, status code).

---

## Auth model

Three layers, three keys:

| Audience | Endpoint | Header | Where the key comes from |
| --- | --- | --- | --- |
| **SDK / app** | `POST /api/v1/events` (write), `GET /api/v1/usage/*` (read) | `x-ve-key: vt_live_…` | Tenant API key, issued in the dashboard or via admin API |
| **Dashboard frontend** | `/api/dashboard/*` | `Authorization: Bearer <Clerk JWT>` | Clerk session token, auto-resolves the user's tenant |
| **Internal admin tools** | `/api/admin/*` | `Authorization: Bearer <ADMIN_API_KEY>` | Worker secret, used for service-to-service tenant + key CRUD |

API keys are stored as SHA-256 hashes; only the prefix (`vt_live_AbCd`) is kept in plaintext for display. Revoke from the dashboard or via `DELETE /api/admin/keys/:id`.

---

## API reference

Every route below is on the deployed worker (default `https://track.viewengine.ai`).

### Public · `/api/v1` · auth `x-ve-key`

| Method | Path | Body / Query | Returns |
| --- | --- | --- | --- |
| `POST` | `/events` | `{ app, events: [{ id, timestamp, clerk_user_id, clerk_org_id, provider, model, prompt_tokens, completion_tokens, latency_ms, cost_usd, status_code }] }` | `{ received, accepted }` |
| `GET` | `/usage/by-app` | `?fromDays=7&app=&provider=&clerk_org_id=&clerk_user_id=` | `{ groups[], totals }` |
| `GET` | `/usage/by-org` | same filters | `{ groups[], totals }` |
| `GET` | `/usage/by-user` | same filters | `{ groups[], totals }` |
| `GET` | `/usage/by-provider` | same filters | `{ groups[], totals }` |
| `GET` | `/usage/by-model` | same filters | `{ groups[], totals }` |
| `GET` | `/usage/totals` | same filters | `{ totals }` |
| `POST` | `/canary` | — | `{ runId, success }` |

### Admin · `/api/admin` · auth `Bearer ADMIN_API_KEY`

| Method | Path | Body | Returns |
| --- | --- | --- | --- |
| `POST` | `/tenants` | `{ name, clerk_org_id?, plan? }` | `{ tenant }` |
| `GET` | `/tenants` | — | `{ tenants[] }` |
| `GET` | `/tenants/:id` | — | `{ tenant }` |
| `PUT` | `/tenants/:id` | `Partial<{ name, clerk_org_id, plan }>` | `{ tenant }` |
| `DELETE` | `/tenants/:id` | — | `{ tenant }` |
| `POST` | `/tenants/:tenantId/keys` | `{ name }` | `{ apiKey: { fullKey, prefix, … } }` ← `fullKey` shown once |
| `GET` | `/tenants/:tenantId/keys` | — | `{ apiKeys[] }` |
| `DELETE` | `/keys/:id` | — | `{ apiKey }` |

### Dashboard · `/api/dashboard` · auth Clerk JWT

Used by the React Router frontend. Backend resolves the user's Clerk org → tenant (auto-creates on first hit), then exposes `/me`, `/keys`, `/overview`, `/canary`. Not intended for external use.

---

## Architecture

```
┌────────────────────────────────────────────────────────────┐
│ Each app (ve-fanout, ve-rank, ve-radar, …)                 │
│   import { trackedHandler } from "@viewengine/track";      │
└──────────────────┬─────────────────────────────────────────┘
                   │ POST /api/v1/events  (x-ve-key)
                   │ buffered per-request, flushed via ctx.waitUntil
                   ▼
        ┌──────────────────────────────────────────────────┐
        │ ve-track service (Cloudflare Worker)             │
        │  ┌─────────────────────────────┐                 │
        │  │ Hono · /api/v1 (api-key)    │                 │
        │  │ Hono · /api/admin (bearer)  │                 │
        │  │ Hono · /api/dashboard (JWT) │                 │
        │  └──────────────┬──────────────┘                 │
        │                 │ Drizzle ORM                    │
        │  ┌──────────────▼──────────────┐                 │
        │  │ D1 · usage_events           │                 │
        │  │ D1 · api_keys (sha-256)     │                 │
        │  │ D1 · tenants                │                 │
        │  └─────────────────────────────┘                 │
        │  React Router 7 dashboard at /                   │
        └──────────────────────────────────────────────────┘
```

Per-request flow:

1. SDK installs a global `fetch` hook (idempotent).
2. `trackedHandler` opens an `AsyncLocalStorage` scope around your handler.
3. Every `fetch()` to a known provider:
   - Mutates the request to include attribution headers and `user_id` body fields.
   - Awaits the response.
   - Pushes a `VeTrackEvent` to the request-scoped buffer (via `ctx.waitUntil`).
4. When the handler returns, the buffer is flushed to `POST /api/v1/events` (also via `ctx.waitUntil`) — your response is **never** blocked on telemetry.
5. The service stamps `tenant_id` from the API key, validates the rows, and inserts into D1.

---

## Self-host the service

The `service/` folder is a standalone Cloudflare Worker. To run your own copy:

```bash
git clone https://github.com/Handbook-Enterprises/ve-track.git
cd ve-track
bun install                  # SDK deps
cd service
bun install                  # service deps

# 1. Create your D1 database
bunx wrangler d1 create ve-track-db
# paste the returned id into service/wrangler.jsonc → d1_databases[0].database_id

# 2. Apply migrations
bunx wrangler d1 migrations apply ve-track-db --local
bunx wrangler d1 migrations apply ve-track-db          # remote

# 3. Set secrets
bunx wrangler secret put CLERK_SECRET_KEY
bunx wrangler secret put CLERK_PUBLISHABLE_KEY
bunx wrangler secret put ADMIN_API_KEY

bun run dev                  # http://localhost:5173
bun run deploy               # one-shot deploy
```

Apps targeting your self-hosted instance pass `baseUrl`:

```ts
trackedHandler<Env>({
  app: "my-app",
  baseUrl: "https://track.mycompany.com",
  fetch: (req, env, ctx) => app.fetch(req, env, ctx),
});
```

---

## Local development

### SDK

```bash
cd ve-track
bun install
bun run typecheck
```

The SDK is plain TypeScript exported via `package.json#exports` — no build step. Edits in `src/` are picked up by consumers immediately on next install.

### Service

```bash
cd ve-track/service
bun install
bun run dev                  # http://localhost:5173 (React Router) + /api (Hono)
```

Required `service/.dev.vars`:

```
ADMIN_API_KEY=<random long string>
CLERK_SECRET_KEY=<your clerk secret>
CLERK_PUBLISHABLE_KEY=<your clerk publishable>
```

The dashboard auto-provisions a tenant for whatever Clerk org / personal account you sign in with. Use **API Keys → Create key** to issue a key; the local SDK install in another app can target `http://localhost:5173` via `VE_TRACK_BASE_URL`.

---

## Releasing the SDK

The SDK is shipped as a Git dependency, so "release" = "tag + GitHub Release":

```bash
# from repo root
git checkout main
git pull
# bump version in package.json, commit
git add package.json
git commit -m "chore: release v0.2.0"
git tag v0.2.0
git push --follow-tags
```

`.github/workflows/release.yml` runs on the tag push:

1. Installs deps + `tsc --noEmit` typecheck.
2. Creates a GitHub Release with auto-generated notes.

Consumers update by pinning the new tag:

```bash
bun add github:Handbook-Enterprises/ve-track#v0.2.0
```

For internal "track main" usage, consumers can stay on `#main` — `bun update` pulls the latest commit.

---

## Deploy CI/CD

The `service/` worker has two long-lived environments managed by [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml):

| Branch | URL | Wrangler name | D1 |
| --- | --- | --- | --- |
| `staging` | `https://track-staging.vieweng.in` | `ve-track-staging` | `ve-track-staging-db` |
| `production` | `https://track.viewengine.ai` | `ve-track-prod` | `ve-track-prod-db` |

### Required GitHub secrets

| Secret | Where | Purpose |
| --- | --- | --- |
| `CLOUDFLARE_API_TOKEN` | Repo → Settings → Secrets → Actions | Wrangler auth |

The `production` environment in GitHub should be set up with [required reviewers](https://docs.github.com/en/actions/deployment/targeting-different-environments/using-environments-for-deployment) so prod deploys need an approval click.

### One-time setup per environment

```bash
# create D1 dbs
bunx wrangler d1 create ve-track-staging-db
bunx wrangler d1 create ve-track-prod-db

# paste the returned ids into the deploy scripts:
#   service/scripts/deploy-staging.sh    → VE_TRACK_STAGING_DB_ID
#   service/scripts/deploy-production.sh → VE_TRACK_PROD_DB_ID

# upload secrets per environment (interactive, prompted for value)
bunx wrangler secret put CLERK_SECRET_KEY      --name ve-track-staging
bunx wrangler secret put CLERK_PUBLISHABLE_KEY --name ve-track-staging
bunx wrangler secret put ADMIN_API_KEY         --name ve-track-staging

bunx wrangler secret put CLERK_SECRET_KEY      --name ve-track-prod
bunx wrangler secret put CLERK_PUBLISHABLE_KEY --name ve-track-prod
bunx wrangler secret put ADMIN_API_KEY         --name ve-track-prod
```

`keep_vars: true` in the deploy scripts means these secrets persist across deploys.

### Promotion flow

```bash
# new feature
git checkout -b feat/something
# … work, commit, push, open PR …
git checkout staging && git merge feat/something && git push   # → staging deploys
# soak. verify dashboard, check usage rows landing.
git checkout production && git merge staging && git push       # → prod deploys (requires reviewer)
```

Pull requests to either branch only run the `check` job (typecheck + build) — no deploy.

### Manual deploy (escape hatch)

```bash
cd service
bash scripts/deploy-staging.sh         # or deploy-production.sh
```

Requires `CLOUDFLARE_API_TOKEN` env var and authenticated `wrangler login`.

---

## License

MIT.
