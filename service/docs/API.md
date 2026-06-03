# VE Track API (v1)

Versioned, machine-facing HTTP API for **VE Track** — ViewEngine's cost-attribution service. Ingest provider-usage events and query cost/usage/profitability aggregations. Tenant-scoped by API key.

Most apps never call this directly — they use the [`@viewengine/track`](../../README.md) SDK, which auto-tracks every provider `fetch` and ships events here. The raw API below is for custom integrations, dashboards, and scripts.

## Base URL

| Environment | URL |
|-------------|-----|
| Production  | `https://track.viewengine.ai` |
| Local dev   | `http://127.0.0.1:5174` (`react-router dev`) |

Programmatic routes live under `/api/v1`.

## Authentication

Send your tenant API key in the `x-ve-key` header:

```
x-ve-key: <your-key>
```

Keys are minted and revoked in the VE Track dashboard (Keys page). Each key resolves to a **tenant**; all reads and writes are scoped to that tenant. A missing/invalid key returns `401`.

> The dashboard (`/api/dashboard/*`) and the cross-tenant admin rollups (`/api/admin/*`, `Authorization: Bearer $ADMIN_API_KEY`) are separate surfaces and not covered here — `/api/v1` is the public, per-tenant API.

## Conventions

- Responses are JSON. Aggregation endpoints return `{ success, message, ... }` with the data inline.
- Errors are `{ "message": "..." }` (optionally `{ "message", "errors" }`) with the matching HTTP status.

### Common query filters

All `usage/*` and `breakdown/*` reads accept:

| Param | Meaning |
|-------|---------|
| `fromDays` | Look-back window in days |
| `app` | Filter to one app |
| `provider` | Filter to one provider (openai, anthropic, …) |
| `clerk_org_id` | Filter to one org |
| `clerk_user_id` | Filter to one user |
| `action` | Filter to one action label |

## Endpoints

### Ingest

#### `POST /api/v1/events`

Record usage events. Body:

```json
{
  "app": "my-app",
  "events": [
    {
      "id": "evt_…",
      "timestamp": 1730000000000,
      "clerk_user_id": "user_123",
      "clerk_org_id": "org_123",
      "action": "chat.completion",
      "provider": "openai",
      "model": "gpt-4o",
      "prompt_tokens": 1200,
      "completion_tokens": 380,
      "latency_ms": 850,
      "cost_usd": 0.0123,
      "status_code": 200,
      "credits_charged": 13,
      "credit_price_usd_at_event": 0.001,
      "correlation_id": "req_abc"
    }
  ]
}
```

```bash
curl -s -X POST https://track.viewengine.ai/api/v1/events \
  -H "x-ve-key: $VE_TRACK_KEY" -H "Content-Type: application/json" \
  -d @events.json
```

### Usage aggregations

| Method | Path | Returns |
|--------|------|---------|
| GET | `/api/v1/usage/by-app` | cost/tokens/requests grouped by app |
| GET | `/api/v1/usage/by-org` | grouped by Clerk org |
| GET | `/api/v1/usage/by-user` | grouped by Clerk user |
| GET | `/api/v1/usage/by-provider` | grouped by provider |
| GET | `/api/v1/usage/by-model` | grouped by model |
| GET | `/api/v1/usage/by-action` | grouped by action |
| GET | `/api/v1/usage/totals` | tenant totals + period-over-period delta |

Each group: `{ key, cost_usd, prompt_tokens, completion_tokens, requests, name?, secondary?, imageUrl? }`. Totals add `fromDays` and a `delta { previousCost, pctChange, direction }`.

```bash
curl -s "https://track.viewengine.ai/api/v1/usage/by-provider?fromDays=30" \
  -H "x-ve-key: $VE_TRACK_KEY"
```

### Profitability

| Method | Path | Returns |
|--------|------|---------|
| GET | `/api/v1/breakdown/profitability?by=<dim>` | revenue vs cost margin grouped by `app`/`org`/`user`/`provider`/`model`/`action` |
| GET | `/api/v1/breakdown/profitability/totals` | total revenue, cost, margin, credits |

Each group: `{ key, revenue_usd, cost_usd, margin_usd, margin_pct, credits_charged, requests, name?, secondary? }`.

### Canary

#### `POST /api/v1/canary`

Runs a tenant canary check (used by monitoring). No body.

### Health

`GET /api/health` — public, unauthenticated liveness check.

## Status codes

| Code | Meaning |
|------|---------|
| 200 | OK |
| 401 | Missing/invalid `x-ve-key` |
| 404 | Unknown route |
| 500 | Server error |
