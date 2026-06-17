# Cost Connectors — connecting provider accounts for ground-truth cost

Status: planning. Owner: Sylvester. Last updated: 2026-06-17.

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

| Provider | Pull capability | Endpoint (verify at build) | Key type | Dedup id | Attribution | Phase |
|---|---|---|---|---|---|---|
| OpenAI | ✅ daily cost + usage | `/v1/organization/costs`, `/v1/organization/usage/*`; `/v1/me` for org id | **Admin** `sk-admin-…` | org id (`org-…`) | project / api key / model | 1 |
| Anthropic | ✅ cost + usage report | Usage & Cost Admin API | **Admin** `sk-ant-admin…` (org accounts only) | org (key is org-scoped) | workspace / api key / model / tier | 1 |
| OpenRouter | ✅ credits + activity | `/api/v1/credits`, `/api/v1/activity` (30d, by endpoint, filter by key hash / org member) | management key | org member id / key hash | endpoint / member | 2 |
| Fal | ✅ usage + invoice | `/account/focus` (invoice or estimate), usage-by-model | **Admin** key | workspace/account | model | 2 |
| Apify | ✅ monthly usage | `/v2/users/me/usage/monthly`, `/v2/users/me` | API token | user id | account (compute units → $) | 2 |
| DataForSEO | ✅ spend + balance | `/v3/appendix/user_data` | login/password (basic) | account login | per API / endpoint | 2 |
| Zyte | ✅ stats (cost) | `zyte-api-stats.zyte.com/api/stats?organization_id=…` | dashboard API key (basic) | organization id | account | 2 |
| BrightData | ⚠️ balance only | `/customer/balance` (balance + pending) | Bearer token | customer/account | none (poll balance, diff over time) | 3 |
| Firecrawl | ⚠️ remaining tokens | `/v2/team/token-usage` (remaining, billing period) | API key | team/org | none (delta over time) | 3 |
| Perplexity | ❌ no public cost API | dashboard only (by model, by key) | — | — | fallback: SDK per-request cost or manual import | 3 |
| Gemini (Google) | ❌ no per-key cost API | Cloud Billing → BigQuery export | GCP service account | billing account / project | project labels | 3 |
| Cloro | ❓ no public usage API found | — | — | — | fallback: SDK per-request credits | 3 |

Legend: ✅ historical cost reachable · ⚠️ point-in-time only (balance/remaining → derive spend by diffing snapshots) · ❌ no usable API (fallback to SDK capture or manual/CSV import).

---

## Phases

**Phase 0 — Simplify the Usage tab to be provider-based.** Ship first. Makes Provider the primary lens and creates the surface where "Connected accounts" slot in per provider. No key handling yet.

**Phase 1 — OpenAI + Anthropic connect (admin key, pull).** Highest value, cleanest APIs, richest attribution. Build the connect flow, encrypted key storage, org-id dedup, daily pull, and the reconciliation rule end to end here — these two prove the whole pattern.

**Phase 2 — Account-key pulls: OpenRouter, Fal, Apify, DataForSEO, Zyte.** Each has a usage/cost endpoint reachable by an account key; mostly the same pipeline with per-provider adapters.

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
- [OpenRouter credits](https://openrouter.ai/docs/api/api-reference/credits/get-credits) · [OpenRouter activity](https://openrouter.ai/docs/api/api-reference/analytics/get-user-activity)
- [Fal account/FOCUS billing](https://fal.ai/docs/platform-apis/v1/account/focus)
- [Apify monthly usage](https://docs.apify.com/api/v2/users-me-usage-monthly-get)
- [DataForSEO appendix/user_data](https://docs.dataforseo.com/v3/appendix-user-data/)
- [Zyte stats API](https://docs.zyte.com/zyte-api/usage/stats.html)
- [BrightData total balance](https://docs.brightdata.com/api-reference/account-management-api/Get_total_balance_through_API)
- [Firecrawl token usage](https://docs.firecrawl.dev/api-reference/endpoint/token-usage)
- [11 AI API cost tools 2026 (gateway vs billing-ingest)](https://blog.alephant.io/11-ai-api-cost-tools-for-multi-provider-spend-in-2026/) · [AWS KMS multi-tenant encryption](https://aws.amazon.com/blogs/architecture/simplify-multi-tenant-encryption-with-a-cost-conscious-aws-kms-key-strategy/)
