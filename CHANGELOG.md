# Changelog

Version history for `@viewengine/track`, plus the pricing, architecture, dashboard, and self-host notes that used to live in the README. The [README](./README.md) is now integration-only.

---

## v0.8.0 — 2026-07-09

### Action management and unattributed drill downs

When an action name changes in code, its history splits in two and the dashboard cannot tell you what anything really cost. Actions are now manageable: rename what you see without touching code, and merge a mistakenly renamed action back into one line. Unattributed segments (events sent without an action, model, user, or org) are now first class citizens you can open and audit like any other row.

- **Rename actions** — every action row (Actions table and detail sheet) has a menu with Rename. The display name is what reports show; the slug your code sends stays the permanent id and is displayed beneath the name. Stored in the existing `actions` registry, applied at read time across Overview and Credits.
- **Merge actions** — the same menu offers Merge into another action: pick a target from a searchable list, review exactly how many calls and how much spend will move, then confirm. The merge retags the historical `usage_events` rows in one statement and records an alias, so future events arriving with the old slug are recorded under the target automatically at ingest. The rewrite is permanent; the confirm step says so before anything happens.
- **New endpoints** `PATCH /api/dashboard/actions/rename` (`{ slug, name }`) and `POST /api/dashboard/actions/merge` (`{ from, into }`, returns the retagged row count). Merging into an already merged action is rejected; existing aliases pointing at the merged slug are repointed to the new target.
- **Unattributed drill downs** — clicking Untagged, Unknown, Anonymous, or Personal / no org now opens a real detail sheet filtered to events where that field is null, honoring the period picker. Previously these rows silently showed the last opened entity's data. The nullable filters (`action`, `model`, `clerk_user_id`, `clerk_org_id`) accept the sentinel `__none__` on all aggregation endpoints.
- **Migration**: adds nullable `actions.merged_into` (`0028_actions_merged_into.sql`), applied automatically by the deploy scripts. No SDK changes; keep sending raw action slugs.

## v0.7.0 — 2026-07-07

### Credits economics dashboard

The dashboard now answers the money question directly: are your credits priced above what they cost you. A new Credits tab shows revenue (credits charged × price at event) against actual provider cost across every dimension, plus the unit numbers needed to price credits and size free signup grants.

- **New Credits tab** — headline stats (Revenue, Provider cost, Margin, Credits charged, each with prior window deltas), a daily revenue vs cost chart where the gap between the two areas is your margin, and a breakdown across Apps, Actions, People, Organizations, Providers, and Models with revenue, cost, margin, and margin percent per row.
- **Unit economics panel** — per credit figures: realized average price, blended cost per credit (your break even price), margin kept per credit, markup over your configured default price, users charged credits, and average/median credits per user normalized to a month. Includes a free signup credit calculator: enter a grant size and see what it costs you per signup at your current cost per credit.
- **New endpoint `GET /api/dashboard/credits`** (Clerk authed, tenant scoped) — aggregated profitability totals, deltas, daily series, and six dimension breakdowns in one call. Headline cost blends connected tracker billing the same way Overview does, while revenue and credits always come from SDK events; per dimension tables use SDK event cost only, since tracker spend has no app or action dimension.
- No SDK changes, no migration.

## v0.6.2 — 2026-07-06

### Provider organization duplicate detection for trackers

Providers like OpenRouter and Anthropic report spend for the whole organization, not per key. Multiple keys from one organization each pulled the identical org total and inflated the tenant's provider spend by that multiple. Trackers now detect and block same org keys, and flag duplicates that already exist.

- **Same org check on connect and key update** — `TrackerService.create` and `updateKey` now run an adapter level `sameAccount` comparison against every existing tracker for that provider in the tenant. OpenRouter compares the provisioning key's org key list (`GET /api/v1/keys` hash overlap) and falls back to an exact `total_credits` + `total_usage` fingerprint from `GET /api/v1/credits` fetched with both keys at the same moment. A confirmed match is rejected with a message naming the account it clashes with. The check is best effort: provider errors skip the comparison instead of blocking the add.
- **Anthropic gets a real org identity** — `validate` now calls `GET /v1/organizations/me`, so the dedup hash is the organization id (a second admin key from the same org is rejected outright) and `account_ref` becomes the organization name instead of `acct ····last4`.
- **Dashboard duplicate flag** — provider groups whose accounts report an identical nonzero lifetime total show a "duplicate org" badge, a warning alert explaining the double counting, and a "same org" badge on each affected account row. This catches duplicates connected before this release.
- **Disconnect copy corrected** — the confirm dialog claimed pulled spend stays after disconnecting; it is actually removed along with the tracker's snapshots, which is the intended cleanup path for duplicate org keys.
- No SDK changes, no migration. Existing trackers keep working; cleanup of already connected duplicates is a manual disconnect per extra key.

## v0.6.1 — 2026-07-06

### Organization default credit price

Organizations that charge the same credit price across all their apps no longer need to pass `creditPriceUsd` in every integration. Set the price once in the dashboard and every credit event picks it up automatically.

- **New setting: Settings → Credits → Default credit price** — the USD value of one credit for the whole tenant. Stored as nullable `credit_price_usd` on `tenant_settings`; leaving it empty preserves the previous behavior exactly (unpriced credit events contribute zero revenue).
- **Ingest fallback** — `POST /api/v1/events` now stamps the tenant default onto any event that carries `credits_charged` without `credit_price_usd_at_event`. The price is snapshotted at ingest, so later changes to the default never rewrite historical revenue. An explicit `creditPriceUsd` from the SDK always wins, which is how an app with unique pricing overrides the org default.
- **Settings API** — `GET/PATCH /api/dashboard/settings` now include `credit_price_usd` (number or null; PATCH validates finite, zero or greater, null clears).
- No SDK changes. `trackCredits` / `trackUsage` signatures are untouched; `creditPriceUsd` simply became optional in practice for orgs using the default.

### Self-host / migration required
- Apply migration `0027_tenant_settings_credit_price.sql` — `cd service && wrangler d1 migrations apply ve-track-db --remote` (and `--local`). It adds the nullable `credit_price_usd` column to `tenant_settings`. No data movement, no behavior change until a tenant sets a value.

## v0.6.0 — 2026-07-02

### Credit usage tracking across every dimension

Apps that bill users in credits (via Autumn or any credit system) can now report deductions to ve-track and see credit usage broken down by app, action, user, org, provider, and model — everywhere cost already shows.

- **New SDK API `trackCredits(input)`** — call it after your billing call (e.g. Autumn's `track`) succeeds. Emits a standalone credit event (`provider: "autumn"` by default, overridable) that inherits the scope's app, user, org, and action. Silent no-op outside a scope.
- **`trackUsage` now accepts `creditsCharged` and `creditPriceUsd`** so a credit deduction can ride on the same event as the provider call that caused it, feeding the profitability endpoints.
- **All usage aggregations return `credits`** — `GET /api/v1/usage/by-app|by-org|by-user|by-provider|by-model|by-action`, `usage/totals`, the daily series, and the dashboard overview each sum `credits_charged` per group. The dashboard shows a Credits column on every entity table, a Credits headline stat in entity detail sheets, and a "Credits used" card on Overview.
- **Profitability now supports `by=model`** in addition to app/action/org/user/provider.

### `credit_pricing` renamed to `credits`

The `credit_pricing` table and its `CreditPricing` model were renamed: model file is now `backend/models/credit.model.ts` exporting `Credit`, table is `credits`, index is `idx_credits_lookup`.

### Self-host / migration required
- Apply migration `0026_rename_credit_pricing_to_credits.sql` — `cd service && wrangler d1 migrations apply ve-track-db --remote` (and `--local`). It renames `credit_pricing` to `credits` and recreates the lookup index. No data movement; the table has no runtime readers yet.
- The SDK change is additive: existing integrations keep working without changes. Bump `@viewengine/track` in your apps to get `trackCredits`.

## v0.5.5 — 2026-06-20

### Tracker cost moved out of usage_events into its own table

Provider-billing cost from manual trackers is no longer written into `usage_events`. Direct API usage has no app and produces no usage events, so it now lives in a dedicated `tracker_costs` table (migration `0018`), keyed per tracker per day with `cost_usd` and `requests`. This cleanly separates SDK app telemetry from connected-account billing.

- **Sync** aggregates the provider pull to one row per day and upserts into `tracker_costs`; the account's `pulled_cost_usd` is summed from there.
- **Account detail** reads from a new endpoint, `GET /api/dashboard/trackers/:id/costs?from=&to=`, returning the saved daily series + totals (Spend, Calls). Disconnecting a tracker now also deletes its saved cost history.
- **`usage_events` reverted to SDK-only:** removed the billing/carrier writes, dropped the `request_count`-based requests aggregation (back to `COUNT(*)`), and removed `request_count` from the model. The column added by migration `0017` is now unused and can be dropped at your convenience; leaving it is harmless.

### Self-host
- Apply migration `0018_tracker_costs.sql` — `cd service && wrangler d1 migrations apply ve-track-db --remote` (and `--local`).

## v0.5.4 — 2026-06-20

### Daily tracker scraping moved to a Cloudflare Queue

The daily provider-cost pull no longer runs as a sequential loop inside the cron. A daily cron (`0 3 * * *`) now **enqueues one message per active tracker** onto a `TRACKER_QUEUE`, and a queue consumer (`backend/consumers/tracker.consumer.ts`) syncs each tracker independently, with retries (`max_retries: 3`). This isolates failures per tracker, parallelizes the work, and avoids the single-cron time ceiling as the number of trackers grows. The pulled cost is upserted into `usage_events` as before, so the detail sheet keeps reading saved history from the database (never the live provider API). The hourly cron still refreshes the models.dev pricing catalog.

### Self-host — create the queue before deploying
- `cd service && wrangler queues create ve-track-tracker-sync`
- Then `wrangler types` (already committed) and deploy. Without the queue the worker falls back to the in-cron sequential sync, so nothing breaks, but creating the queue is what enables the consumer path.

## v0.5.3 — 2026-06-19

### Tracker detail: spend over time, real call counts, tokens dropped

- **Spend over time is retained.** Each tracker's authoritative daily cost is pulled on the cron and upserted into `usage_events` per day, so the account detail sheet's graph accumulates real history over time.
- **Real call counts.** Added a `request_count` column to `usage_events` (migration `0017`); the requests metric is now `SUM(COALESCE(request_count, 1))`, so SDK events still count as one each while provider-billing rows carry the provider's reported request count. OpenAI request counts are pulled from `/v1/organization/usage/completions`. Anthropic's cost API does not expose request counts, so Calls/Avg-per-call show `—` for Anthropic trackers.
- **Detail sheets.** The tracker (cost-only) sheet is now just the spend graph + summary (Spend, Calls, Avg/call) with the model breakdown removed. Token counts were removed from both the tracker and the usage provider detail sheets.

### Self-host
- Apply migration `0017_usage_request_count.sql` — `cd service && wrangler d1 migrations apply ve-track-db --remote` (and `--local`). Backward compatible: existing rows have a null `request_count` and keep counting as one request each.

## v0.5.2 — 2026-06-19

### Trackers: rotate a key, key-failure email alerts, collapsible provider rows

- **Rotate an account's key.** When a provider revokes, rotates, or expires a key, you can paste a fresh one in place from the account row (`PATCH /api/dashboard/trackers/:id`). The new key is re-validated with the provider and re-encrypted before the old one is replaced, and the tracker resumes pulling immediately.
- **Email alert on key failure.** When a sync fails with an auth error (revoked/expired key), ve-track emails the workspace owner once (via Resend) with a link to update the key, and only re-alerts after the next healthy→failed transition (no repeat spam each cron tick). Requires `RESEND_API_KEY` and `RESEND_FROM_EMAIL` to be set; without them the alert is skipped silently.
- **Collapsible providers.** The Trackers page reads as a table of providers; each row collapses/expands with a chevron to reveal its accounts.

## v0.5.1 — 2026-06-19

### Trackers simplified: provider + key, accounts combine per provider

Connecting a provider account no longer asks for a tracker name or an app. Direct API usage is not tied to an app you built, so those fields were noise. A tracker is now just **provider + key**.

- **Identity is the provider account.** Connecting the same account again is rejected with a clear "you are already tracking costs from this provider account."
- **Different accounts of the same provider combine.** Add as many keys as you use; their costs add up under one provider total instead of being split out as separate organizations.
- Pulled cost rows now attribute to the `external` app bucket (direct, non-app spend) rather than a user-entered app name.

### Self-host
- Apply migration `0016_trackers_drop_label_app.sql` — `cd service && wrangler d1 migrations apply ve-track-db --remote` (and `--local`) — which drops the `label` and `app` columns from `trackers`.

## v0.5 — 2026-06-19

### First-class dimension entities: Apps, Actions, People, Organizations, Models

The four attribution dimensions that used to live only as denormalized strings on `usage_events` are now first-class, tenant-scoped records you can manage, with full CRUD over the authenticated dashboard API. They link back to live event data by key (apps/actions by `slug`, people/organizations by `external_id`, which is the Clerk id), and relationships are optional (`action.app_slug`, `person.organization_external_id`) so the model works flat or hierarchical.

- **Tables (migrations `0014_dimension_entities.sql`, `0015_models.sql`):** `apps`, `actions`, `people`, `organizations`, `models`. Each is tenant-scoped with `status` + timestamps; `actions` carry an optional `app_slug` and `credits_per_call`; `people` carry `email`, `avatar_url`, and an optional `organization_external_id`; `models` key on `(provider, model_id)` and line up with the global `model_pricing` catalog without duplicating pricing.
- **Endpoints (Clerk-authenticated, tenant-scoped):** `GET/POST /api/dashboard/{apps,actions,people,organizations,models}` and `GET/PATCH/DELETE /api/dashboard/{...}/:id`. Each follows the existing service contract (`{ success, message, data }`) with duplicate and not-found guards.
- **Architecture:** standard per-entity vertical slices (model → repository → service → routes + messages + interface). The five CRUD controllers were collapsed into one reusable `createCrudController(service)` factory since they were identical apart from the service.

### Self-host
- Apply migrations `0014` and `0015` — `cd service && wrangler d1 migrations apply ve-track-db --remote` (and `--local`) — to create the five tables. No change to existing data; `usage_events` is untouched and these records are additive.

## v0.4.1 — 2026-06-19

### Trackers refinements: add-method chooser, multiple accounts per provider

- **"Add a tracker" now asks how the spend reaches you first.** Two paths: **Integrate into an app** (shows the one-line `trackedHandler` snippet, a Copy button, a link to the full docs, and a Get-API-key shortcut) or **Add manually** (the connect-an-account form, for spend made directly against a provider outside any app you built). This removes the confusion where people did not realize manual mode is specifically for non-app, direct API usage.
- **Multiple accounts per provider.** The Trackers page now groups by provider. Clicking a provider opens a sheet listing each connected account. A single provider can hold more than one billing **organization** (e.g. two different OpenAI orgs), detected via the key, and the UI calls that out clearly so their costs are never assumed to be the same account. Each tracker now stores an `account_ref` (OpenAI org id, or `acct ····<last4>` where the provider does not expose one).
- **Docs: Copy for LLM.** The `/docs` page has a "Copy for LLM" button that copies a complete, self-contained integration guide to the clipboard for pasting into an assistant.

### Self-host
- Apply migration `0013` — `cd service && wrangler d1 migrations apply ve-track-db --remote` (and `--local`) — which renames the `cost_trackers` table to `trackers` and adds the `account_ref` column. The model is now exported as `Tracker`.

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
