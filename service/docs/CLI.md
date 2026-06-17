# VE Track CLI (`ve-track`)

A non-interactive, scriptable CLI over the [VE Track API](./API.md). JSON on stdout, messages on stderr. Built for scripts and LLM agents — no interactive prompts. Auth is a tenant **API key** (no browser login).

## Run

```bash
bun run ve-track -- --help
# or directly
bun cli/ve-track.ts --help
```

## Authenticate

Mint a key in the VE Track dashboard (Keys page), then pass it via env or flag:

| Env var            | Flag    | Purpose                                              |
| ------------------ | ------- | ---------------------------------------------------- |
| `VE_TRACK_KEY`     | `--key` | Tenant API key (sent as `x-ve-key`)                  |
| `VE_TRACK_API_URL` | `--url` | API base URL (default `https://track.viewengine.ai`) |

```bash
export VE_TRACK_KEY="ve_..."
ve-track usage totals --from-days 30
```

## Commands

All query commands accept the same filters: `--from-days`, `--app`, `--provider`, `--org` (Clerk org id), `--user` (Clerk user id), `--action`.

```bash
# Ingest events (body { app, events: [...] } from a file)
ve-track events --input ./events.json

# Usage aggregations
ve-track usage by-app --from-days 30
ve-track usage by-provider
ve-track usage by-model --app my-app
ve-track usage by-org --from-days 7
ve-track usage by-user --org org_123
ve-track usage by-action
ve-track usage totals --from-days 30

# Profitability (revenue vs cost margin)
ve-track profitability --by provider --from-days 30
ve-track profitability-totals --from-days 30

# Canary + health
ve-track canary
ve-track status          # public, no key required
```

## Recipes

```bash
# This month's usage logs, sorted
ve-track usage by-provider --from-days 30 | jq '.groups // . | sort_by(-.cost_usd)'

# Margin by app
ve-track profitability --by app --from-days 30 | jq '.'

# Point at a local backend
ve-track --url http://127.0.0.1:5174 status
ve-track --url http://127.0.0.1:5174 --key "$VE_TRACK_KEY" usage totals
```

> Response field names follow the API payloads (see [API.md](./API.md)) — inspect a call with `jq` to confirm the exact shape for your scripts.

## Emitting events

For most apps you should **not** post events by hand — install the [`@viewengine/track`](../../README.md) SDK, which wraps your Worker/Node handler and auto-ships every provider `fetch`. Use `ve-track events` only for backfills or custom integrations.
