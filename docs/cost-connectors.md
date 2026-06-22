# Cost Connectors — connecting provider accounts for ground-truth cost

Status: Phase 0 + Phase 1 shipped; OpenRouter, Apify, DataForSEO, Zyte (Phase 2) shipped on the native per-provider metric model (see "Cost model v2"). Owner: Sylvester. Last updated: 2026-06-22.

This is the plan for tracking spend from people who use provider APIs **directly** (scripting, notebooks, non ve-app work) and never touch the `@viewengine/track` package. The package keeps doing per-request attribution for ve-apps; this adds a second, parallel path: **connect a provider account once, we pull the actual cost from the provider on a schedule.**

---

## Decision: paste-key / pull, not a gateway

Two architectures exist for this:

- **Gateway / proxy** (Cloudflare AI Gateway, Helicone, LiteLLM, Portkey) — the customer routes their calls through us.
- **Connect-account / billing pull** (Vantage, CloudZero, Datadog, Finout) — the customer connects a read key in our dashboard; we pull the provider's usage/cost API. Zero code change.

**We are going with connect-account / pull.** Rationale (for commercialization): a gateway forces every customer who already lives on the raw provider APIs to re-route their scripts through us — a migration cost, a new latency hop, and a hard dependency that fails when our gateway fails. "Connect your account in the dashboard, change nothing in your code" is the lower-friction commercial story and is why the billing-pull tools win on adoption.

The gateway stays a *future option* for customers who want real-time enforcement, not a requirement.

---

## The model

1. **Connect once per provider org, not per developer.** Provider cost/usage keys are org/account scoped, so one connection covers the whole team and the provider's own breakdown (by project / api key / user) attributes it back. The only team habit needed is a **naming convention** ("name your provider project/key after yourself or your app"), not a paste-a-key chore for everyone.
2. **Reframe the UI: "Connect a provider account," not "create a cost."** You are connecting an account; cost is the result.
3. **Dedup on connect.** Fetch an account/org identifier from the key, hash it, and block or merge if that account is already connected (by anyone in the tenant). Secondary check: if two connections return an identical daily cost series, they are the same account.
4. **Reconciliation rule (prevents double counting):** for a connected account, the **provider-pulled actuals are the source of truth for dollars**. Any SDK events from the same account become attribution detail (who / what / which app), never additive cost. Without this rule, app spend gets counted twice — once estimated by the SDK, once actual from the billing pull.
5. **Pull on a daily cron** (we already run one), store actuals in their own table tagged with `cost_source = provider_billing`, never overwrite SDK rows.

---

## Provider catalog

What each supported provider exposes to a connected key, the auth it needs, the identifier we dedup on, and the attribution granularity. Endpoints to be re-verified at build time.

| Provider | Metric shown | Endpoint (verify at build) | Key type | Dedup id | Phase |
|---|---|---|---|---|---|
| OpenAI | this month + 7 days (+requests) | `/v1/organization/costs` (month start, `bucket_width=1d`); `/v1/me` for org id | **Admin** `sk-admin-…` | org id (`org-…`) | 1 |
| Anthropic | this month + 7 days | `/v1/organizations/cost_report` (month start, 1d) | **Admin** `sk-ant-admin…` (org accounts only) | org (key is org-scoped) | 1 |
| OpenRouter | balance | `/api/v1/credits` (`total_credits − total_usage`) | **Provisioning** (management) key | hash of key | 2 ✅ |
| Fal | usage + invoice | `/account/focus` (invoice or estimate), usage-by-model | **Admin** key | workspace/account | 2 |
| Apify | this month | `/v2/users/me/limits` (`current.monthlyUsageUsd`); `/v2/users/me` for user id | API token (Bearer) | user id | 2 ✅ |
| DataForSEO | balance | `/v3/appendix/user_data` (`money.balance`) | login/password or Base64 key (basic) | account login | 2 ✅ |
| Zyte | this month + 7 days (+requests) | `zyte-api-stats.zyte.com/api/stats` ×2 windows (`cost_microusd_total` / 1e6) | Stats dashboard API key (basic) + org id | organization id | 2 ✅ |
| BrightData | ⚠️ balance only | `/customer/balance` (balance + pending) | Bearer token | customer/account | none (poll balance, diff over time) | 3 |
| Firecrawl | ⚠️ remaining tokens | `/v2/team/token-usage` (remaining, billing period) | API key | team/org | none (delta over time) | 3 |
| Perplexity | ❌ no public cost API | dashboard only (by model, by key) | — | — | fallback: SDK per-request cost or manual import | 3 |
| Gemini (Google) | ❌ no per-key cost API | Cloud Billing → BigQuery export | GCP service account | billing account / project | project labels | 3 |
| Cloro | ❓ no public usage API found | — | — | — | fallback: SDK per-request credits | 3 |

Legend: ✅ historical cost reachable · ⚠️ point-in-time only (balance/remaining → derive spend by diffing snapshots) · ❌ no usable API (fallback to SDK capture or manual/CSV import).

---

## Phases

**Phase 0 — Simplify the Usage tab to be provider-based.** Ship first. Makes Provider the primary lens and creates the surface where "Connected accounts" slot in per provider. No key handling yet.

**Phase 1 — OpenAI + Anthropic connect (admin key, pull). SHIPPED.** Surfaces as **Trackers** in the dashboard ("Add a tracker"). A tracker is a connected provider account: provider + a label + the app the spend attributes to + a pasted admin key. Highest value, cleanest APIs, richest attribution.

How Phase 1 is built:

- **Storage of pulled cost reuses `usage_events`.** Each daily cost line becomes a row tagged `cost_source = "provider_billing"`, `cost_confidence = "high"`, with `correlation_id = tracker.id` and a deterministic id (`cb_<trackerId>_<day>_<modelslug>_<hash>`) so re-pulls upsert instead of duplicating. This means the Overview page, the Usage provider table, and the Provider Detail Sheet light up with connected spend for free, with no query changes. Known tradeoff: the "Calls" metric counts daily cost-line rows, not real requests, for billing-sourced providers — dollars are exact, request counts are not (the cost endpoints do not return per-request counts).
- **Tracker connections live in `trackers`** (created by `0012_cost_trackers.sql`, renamed from `cost_trackers` by `0013_rename_trackers.sql`; the Drizzle model is exported as `Tracker`). Columns hold envelope-encrypted key material, `key_last4`, `dedup_hash`, `account_ref` (OpenAI org id, or `acct ····<last4>` fallback), `status`, `last_error`, `last_synced_at`, `pulled_cost_usd`.
- **Two ways to add a tracker.** The dashboard "Add a tracker" flow first asks the user to choose: **Integrate into an app** (SDK, for spend inside an app they built) or **Add manually** (connect a provider account by key, for direct/non-app usage). The manual path asks for nothing but **provider + key** — no name, no app, since direct API usage is not tied to an app.
- **Multiple accounts per provider combine.** Trackers are grouped by provider; one provider can hold several billing accounts (different `account_ref`) and their costs **add up into one provider total**. Re-adding the same account is rejected ("already tracking this provider account"). Pulled rows attribute to the `external` app bucket.
- **Encryption** (`backend/lib/connector-crypto.ts`): real envelope encryption with WebCrypto. A random per-record AES-256-GCM data key encrypts the API key; the data key is wrapped by a master key (KEK) read from the `CONNECTOR_ENC_KEY` secret. AAD is bound to `tenant_id`, so one tenant's ciphertext cannot be opened in another's context. The key is write-only (never returned to the client; only last 4 shown). Hardening path: move the KEK into Cloudflare Secrets Store and add per-tenant data keys without changing the record shape.
- **Adapters** (`backend/lib/connectors/index.ts`): `validate(key)` and `pullDailyCosts(key, startMs)` per provider. OpenAI uses `/v1/organization/costs?group_by=line_item` (amounts in USD) and best-effort `/v1/me` for the org dedup id. Anthropic uses `/v1/organizations/cost_report?group_by[]=description` (amounts in **cents**, divided by 100) with `x-api-key` + `anthropic-version: 2023-06-01`; dedup is a hash of the org-scoped key.
- **Pull cadence**: initial 30-day backfill on connect via `c.executionCtx.waitUntil`, then the existing hourly cron re-pulls a trailing 2-day window (capped at 60 days lookback) and upserts. Manual "Refresh now" per tracker is also exposed.
- **Reconciliation**: provider-pulled rows are authoritative dollars. Phase 1 targets direct-API users who do not run the SDK, so there is no overlap yet; when an account also emits SDK events, the join key (provider + app) is where the "actuals win, SDK becomes attribution detail" rule will apply.

Setup note for deploy: set the secret once with `wrangler secret put CONNECTOR_ENC_KEY` (base64 of 32 random bytes, e.g. `openssl rand -base64 32`) and add it to `.dev.vars` for local dev. Without it, the Trackers API returns a clear "not configured" error and the cron pull is skipped.

**Phase 2 — Account-key pulls: OpenRouter, Fal, Apify, DataForSEO, Zyte.** OpenRouter, Apify, DataForSEO, and Zyte are SHIPPED; Fal remains.

### Cost model v2 — native per-provider metric (current)

Earlier iterations forced every provider into daily-spend accumulation, which is wrong: providers expose fundamentally different things (real daily spend vs prepaid balance vs credits). This model, ported from the proven ve-admin implementation, embraces that.

Each adapter exposes `validate(key)` (connect/dedup) and a single **`pull(key): Promise<TrackerResult>`** where `TrackerResult = { monthlySpend, weeklySpend, balanceUsd, creditsRemaining, requestCount }` — all USD, `null` = not available. We show whichever metric the provider actually returns:

| Provider | Endpoint | Metric shown |
|---|---|---|
| OpenAI | `/v1/organization/costs` (month start, `bucket_width=1d`) | This month + Past 7 days (+ requests) |
| Anthropic | `/v1/organizations/cost_report` (month start, 1d) | This month + Past 7 days |
| OpenRouter | `/api/v1/credits` | Balance (`total_credits − total_usage`) |
| Apify | `/v2/users/me/limits` | This month (`current.monthlyUsageUsd`) |
| DataForSEO | `/v3/appendix/user_data` | Balance (`money.balance`) |
| Zyte | `/api/stats` ×2 (month + 7-day windows) | This month + Past 7 days (+ requests) |

The UI picks the primary metric by priority (monthlySpend → balanceUsd → creditsRemaining → requestCount) via `app/utils/tracker-metric.ts`, shared by the provider card and the detail sheet; accounts of one provider share a metric type, so the provider total sums them.

**Storage + history (`0020_tracker_metric_snapshots.sql`).** The latest metrics live on the `trackers` row (`monthly_spend`, `weekly_spend`, `balance_usd`, `credits_remaining`, `request_count`). A daily snapshot of those metrics is written to the new **`tracker_snapshots`** table (one row per tracker per day, id `<trackerId>_<day>`, upsert), which powers the trend chart.

**Cron.** A **daily 00:00 UTC pull** (`wrangler.jsonc` cron `0 0 * * *` → `workers/app.ts` → `TrackerService.enqueueAll`/`syncAll`) refreshes every active tracker and saves that day's snapshot, so users accumulate provider history over time. Connect and manual "Refresh now" run the same `sync`.

**Auth specifics:** OpenAI/Anthropic admin keys; OpenRouter provisioning key; Apify personal token; DataForSEO `login:password` or the Base64 API key (two-mode connect UI, `DataForSeoAuthFields`); Zyte **Stats dashboard** API key + organization id (two-field connect UI, `ZyteAuthFields`), Basic `base64(apiKey:)`.

**Retired:** the snapshot-diff path, `pullCumulativeTotal`, `pullDailyCosts`/`pullDailyRequests`, and writing tracker spend into `usage_events`. The `cost_snapshot` column (`0019`) and the `tracker_costs` table are now legacy (left in place, no longer written; `tracker_costs` is cleared on disconnect).

**Phase 3 — Partial / heavy / none: BrightData, Firecrawl (balance-delta), Gemini (Cloud Billing/BigQuery), Perplexity + Cloro (SDK capture or manual CSV import).**

---

## Security requirements (non negotiable before storing any key)

Storing customers' **admin** keys makes VE Track a top-tier breach target — one compromise = admin access to every connected provider org. Treat accordingly:

- **Envelope encryption with a per-tenant data key**; encryption context bound to `tenant_id` so one tenant's ciphertext can't be decrypted in another's context. On Cloudflare, prefer **Secrets Store** over hand-rolled crypto.
- **Write-only field** — never return a stored key to the client after save; show last 4 + a "connected" state only.
- **Least privilege** on the decrypt path; the daily-pull worker is the only thing that decrypts.
- **Never log keys**; redact in Sentry.
- Request the **most read-restricted key the provider offers** (note: OpenAI admin keys are not granular — flag this to the customer at connect time).
- Support **disconnect / rotate**, and alert the customer's email on connect.

---

## Open questions / build-time spikes

- Confirm exact OpenAI org-id endpoint (`/v1/me`) returns a stable hashable org id for dedup.
- Anthropic: confirm an org identifier is readable from the admin key for dedup.
- BrightData / Firecrawl: confirm whether any historical spend endpoint exists before settling on balance-diffing.
- Perplexity / Cloro: confirm no programmatic cost API before committing to manual import.
- Reconciliation: define the join key between a connected account and existing SDK events (provider + project/key → app/user mapping).

---

## Sources

- [OpenAI Costs API reference](https://developers.openai.com/api/reference/resources/admin/subresources/organization/subresources/usage/methods/costs) · [Usage + Cost cookbook](https://developers.openai.com/cookbook/examples/completions_usage_api) · [view org for a key (`/v1/me`)](https://help.openai.com/en/articles/9132009-how-can-i-view-the-users-or-organizations-associated-with-an-api-key)
- [Anthropic Usage & Cost Admin API](https://platform.claude.com/docs/en/manage-claude/usage-cost-api) · [Vantage: connecting Anthropic](https://docs.vantage.sh/connecting_anthropic)
- [OpenRouter credits (`GET /api/v1/credits`)](https://openrouter.ai/docs/api/api-reference/credits/get-credits) · [OpenRouter activity (`GET /api/v1/activity`)](https://openrouter.ai/docs/api/api-reference/analytics/get-user-activity) · [OpenRouter management/provisioning keys](https://openrouter.ai/docs/guides/overview/auth/management-api-keys)
- [Fal account/FOCUS billing](https://fal.ai/docs/platform-apis/v1/account/focus)
- [Apify monthly usage](https://docs.apify.com/api/v2/users-me-usage-monthly-get)
- [DataForSEO appendix/user_data](https://docs.dataforseo.com/v3/appendix-user-data/)
- [Zyte stats API](https://docs.zyte.com/zyte-api/usage/stats.html)
- [BrightData total balance](https://docs.brightdata.com/api-reference/account-management-api/Get_total_balance_through_API)
- [Firecrawl token usage](https://docs.firecrawl.dev/api-reference/endpoint/token-usage)
- [11 AI API cost tools 2026 (gateway vs billing-ingest)](https://blog.alephant.io/11-ai-api-cost-tools-for-multi-provider-spend-in-2026/) · [AWS KMS multi-tenant encryption](https://aws.amazon.com/blogs/architecture/simplify-multi-tenant-encryption-with-a-cost-conscious-aws-kms-key-strategy/)
