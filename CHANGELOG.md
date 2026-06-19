# Changelog

Version history for `@viewengine/track`, plus the pricing, architecture, dashboard, and self-host notes that used to live in the README. The [README](./README.md) is now integration-only.

---

## v0.4 — 2026-06-18

### Trackers — connect a provider account for ground-truth cost (Cost Connectors Phase 1)

For spend that never runs through the SDK (scripts, notebooks, direct provider API use), the dashboard now has a **Trackers** tab. "Add a tracker" connects a provider account once: pick the provider, name it, choose the app the spend attributes to, and paste a read key. We pull the **real billed cost** from the provider on a schedule. No code change, no gateway.

- **Providers (Phase 1):** OpenAI (`/v1/organization/costs`) and Anthropic (`/v1/organizations/cost_report`), both via an **admin key** (`sk-admin…` / `sk-ant-admin…`). More providers are phased in next (see [docs/cost-connectors.md](./docs/cost-connectors.md)).
- **Backfill + refresh:** connecting backfills the last 30 days, then the daily cron keeps it fresh (re-pulling a trailing window and upserting). A manual "Refresh now" is available per tracker.
- **Where it shows up:** pulled cost flows into the same Overview, Usage provider table, and Provider Detail Sheet as SDK events, tagged `cost_source = "provider_billing"`. Dollars are the provider's exact billed amount.
- **Security:** keys are stored with **envelope encryption** (per-record AES-256-GCM data key wrapped by a master key, AAD bound to the tenant). Keys are write-only — only the last 4 are ever returned. Duplicate provider accounts are blocked per workspace via a dedup hash.

### Compatibility

- **No integration changes required.** Trackers are a dashboard-only, additive feature; the SDK and its public API are unchanged.
- **Self-host — two steps before serving traffic:**
  1. Apply migration `0012` — `cd service && wrangler d1 migrations apply ve-track-db --remote` (and `--local` for dev) — to create the `cost_trackers` table.
  2. Set the encryption secret — `cd service && wrangler secret put CONNECTOR_ENC_KEY` with the base64 of 32 random bytes (`openssl rand -base64 32`), and add the same value to `service/.dev.vars` for local dev. Without it the Trackers API returns a clear "not configured" error and the cron pull is skipped.

## v0.3 — 2026-06-17

### Pricing moved server-side (live models.dev catalog)

Token-based LLM cost (OpenAI, Anthropic, Gemini) is now **computed by the service at ingest**, not baked into the SDK. The service keeps a live copy of the [models.dev](https://models.dev) catalog in D1, refreshed by a daily cron (and self-warmed on first ingest), and prices every event across four buckets: uncached input, cached input (cache read), cache writes, and output.

Because pricing lives server-side, **a price change never requires anyone to redeploy their app** — the next refresh applies it to every app at once. Providers that report their own cost (OpenRouter, Perplexity, Cloro, Fal, Zyte, DataForSEO, Apify, Firecrawl, BrightData) keep that authoritative number untouched.

Every event now carries:

- `cost_source` — `catalog` (priced from models.dev), `provider_response` (the provider reported it), or `estimate` (model not in the catalog yet).
- `cost_confidence` — `high` when priced, `unknown` when the model is unrecognized. Unknown models are surfaced instead of silently recorded as $0.

### Richer token + streaming capture

- **Cached and reasoning tokens** are captured and priced separately (a major prior source of undercounting): OpenAI `cached_tokens` / `reasoning_tokens`, Anthropic `cache_read` / `cache_creation`, Gemini `cachedContentTokenCount` / `thoughtsTokenCount`.
- **Streamed responses are captured** instead of dropped. For OpenAI-compatible providers the SDK sets `stream_options.include_usage`; Anthropic stream usage is summed across `message_start` / `message_delta`.

### Dashboard redesign

- **Overview** is now: total spend for any period (preset windows or a custom date range), provider count, most expensive provider, a spend-over-time chart, and the top 5 providers by spend.
- **Usage** is now provider-based: a single sortable, searchable data table of usage logs (spend, share, calls, tokens, avg/call), driven by the same date-range selector. This sets up per-provider "Connected accounts" (see [docs/cost-connectors.md](./docs/cost-connectors.md)). The old action-centric ledger and stat cards were removed.
- **Provider detail sheet**: clicking a provider row opens a sheet with its own period selector (presets + custom) driving a spend-over-time chart and tabs that break the provider down by model, action, app, person, and organization, all re-querying as the period changes.

### Compatibility

- **No integration changes required.** The public API, config fields, and env vars are unchanged; new event fields are additive, so older SDK versions keep ingesting fine.
- OpenAI/Anthropic/Gemini costs are repriced server-side as soon as the service deploys, for every app — even ones that never upgrade. Already-stored events keep their original cost; only new events are repriced.
- **Optional SDK reinstall** (`bun add github:Handbook-Enterprises/ve-track`) adds cached/reasoning + streaming capture. One behavior change after upgrading: OpenAI-compatible streaming requests get `stream_options.include_usage` injected. Official provider SDKs handle the extra usage chunk transparently; hand-rolled SSE parsers should guard for a final chunk with an empty `choices` array.
- **Self-host:** apply migration `0011` before serving traffic — `cd service && wrangler d1 migrations apply ve-track-db --remote` (and `--local` for dev) — so the new columns and the `model_pricing` table exist.

## v0.2

- Action attribution: every event carries an `action`, with a cost-per-action view for setting credit prices.
- Dashboard: Overview, Usage (TanStack Table, multi-dimension), and Keys pages.

## v0.1

- Initial SDK (`trackHandler` + global-fetch interception) and ingest service (Cloudflare Workers + D1 + Clerk).

---

## Reference

### How it works (architecture)

```
your-app (worker)                      ve-track service (worker)
┌─────────────────────────────┐        ┌──────────────────────────────────┐
│ trackHandler                │        │ POST /api/v1/events              │
│  ├─ patches global fetch    │ POST → │  → validate api key (x-ve-key)   │
│  ├─ scope = AsyncLocalStor. │        │  → derive tenant_id              │
│  └─ on every provider fetch:│        │  → reprice token LLMs from       │
│      capture model, tokens, │        │     models.dev catalog (daily)   │
│      cost, latency          │        │  → batch insert into D1          │
│  → flush at end of request  │        └──────────────────────────────────┘
└─────────────────────────────┘                       │
                                              D1: tenants, api_keys,
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
- **Cost is computed at ingest, server-side.** Token-based LLM events are priced against the live models.dev catalog (cached in D1, refreshed daily); provider-reported costs are preserved as-is. Every event records `cost_source` and `cost_confidence`. Cost is never user-supplied.

### Dashboard

The dashboard at `/dashboard` has three pages:

- **Overview** — total spend for any period (presets or a custom date range), provider count, most expensive provider, a spend-over-time chart, and the top 5 providers.
- **Usage** — usage logs: a sortable, searchable data table (spend, share, calls, tokens, avg/call) over the selected period. The surface where connected provider accounts will surface their pulled actuals.
- **Keys** — issue, rotate, revoke API keys.

The dashboard resolves Clerk user/org IDs to names via `@clerk/backend` server-side, so the UI shows `Sylvester · sylvester@viewengine.ai` instead of `user_3C5DLG5R…`.

### Self-host the service

Everything is in [`/service`](./service): Cloudflare Workers + D1 + React Router 7 + Clerk + Tailwind v4.

```bash
cd service
cp .dev.vars.example .dev.vars   # fill in CLERK_SECRET_KEY etc.
bun run dev                      # http://127.0.0.1:5174
wrangler deploy                  # deploy
wrangler d1 migrations apply ve-track-db --remote   # apply migrations (and --local for dev)
```

Migrations live under `service/backend/migrations`; the frontend under `service/app`. The hourly cron keeps the models.dev pricing catalog fresh.
