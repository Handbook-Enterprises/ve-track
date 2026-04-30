# @viewengine/track

Cost-attribution SDK for ViewEngine. Drops into any Worker, Node, Bun, or Deno app and auto-tracks every provider fetch (OpenRouter, OpenAI, Anthropic, Zyte, DataForSEO, Apify, Firecrawl) — attributing each call to your app, your Clerk org, and your end user.

## Install

```bash
bun add github:Handbook-Enterprises/ve-track
```

or pin a release:

```bash
bun add github:Handbook-Enterprises/ve-track#v0.1.0
```

## One-line integration

```ts
import { trackedHandler, clerkUserResolver } from "@viewengine/track";
import app from "./api/app";

export default trackedHandler<Env>({
  app: "ve-fanout",
  resolveUser: clerkUserResolver,
  fetch: (req, env, ctx) => app.fetch(req, env, ctx),
});
```

That's it. Every `fetch()` to a known provider made anywhere inside your handler is auto-attributed and shipped to ve-track.

## Configuration

| Field | Required | Default | Notes |
| --- | --- | --- | --- |
| `app` | yes | — | Free-form label for this app inside your tenant (`"ve-fanout"`, `"ve-rank"`, etc). |
| `apiKey` | yes (via env) | reads `env.VE_TRACK_KEY` | Or pass `(env) => env.MY_KEY`. |
| `baseUrl` | no | `https://track.viewengine.ai` | Override for self-hosted ve-track. Falls back to `env.VE_TRACK_BASE_URL` when set. |
| `resolveUser` | no | `() => ({ userId: null, orgId: null })` | Pass `clerkUserResolver` (built-in) or your own `(req, env) => Promise<{ userId, orgId }>`. |
| `fetch` | yes | — | Your existing fetch handler. |
| `scheduled` / `queue` / `email` / `tail` / `trace` | no | — | Pass-through. |

## What it does

1. Installs a global `fetch` hook (idempotent, runtime-agnostic).
2. Opens an `AsyncLocalStorage` scope around your handler so every nested `fetch()` is attributed.
3. For each call to a known provider:
   - Mutates the request to include attribution headers and `user_id` body fields.
   - Captures usage (tokens, cost, model) from the response.
4. Buffers events per request and POSTs them to `${baseUrl}/api/v1/events` via `ctx.waitUntil` — never blocking your response.

## Providers

OpenRouter, OpenAI, Anthropic, Zyte, DataForSEO, Apify, Firecrawl. Add a new provider by appending one entry to `PROVIDERS` and exporting your fork.

## Privacy

Bodies are mutated only for attribution headers / `user_id` fields. Request and response bodies are **never** sent to ve-track — only the extracted usage fields (tokens, cost, model, latency, status code).
