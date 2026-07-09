---
name: verify
description: How to verify ve-track backend/dashboard changes end-to-end against local data
---

# Verifying ve-track changes

## Surfaces

- Frontend + API served together: `cd service && npm run dev` → http://127.0.0.1:5174, API under `/api/*` (e.g. `/api/health`, `/api/dashboard/overview`).
- All `/api/dashboard/*` routes require a real Clerk JWT (`backend/middleware/clerk.ts`); there is no dev bypass, so headless curl of dashboard routes is BLOCKED without a browser session. Do not pull users/tokens from the live Clerk API.

## Local data

- Local D1 lives at `service/.wrangler/state/v3/d1/miniflare-D1DatabaseObject/*.sqlite`. Two databases exist; the one with `usage_events` rows is `5a9a5de5...sqlite` (tenant `71f0de8d-88a8-4bc4-829a-906819367426`, mapped to Clerk org `org_3C6RAXuRxEDvvuNFqyULlSIEfyO`).
- Query it with `cd service && bunx wrangler d1 execute DB --local --command "..." --json` (must run from `service/`; `sqlite3` CLI is not installed).
- Seeded shape: ~20 usage_events (all `action` NULL), 5 money trackers (openai, dataforseo, zyte, apify, openrouter) totaling ~$7,566.74 in `pulled_cost_usd`, 15 tracker_snapshots.

## Driving service-layer changes when auth blocks the socket

Run the real service code against the real local D1 with bun + drizzle bun-sqlite (runtime-compatible with the D1 driver for all query-builder reads; only `db.batch` in the ingest path is D1-specific):

```ts
import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import DashboardService from "./backend/services/dashboard.service";
const db = drizzle(new Database("<the 5a9a sqlite path>", { readonly: true }));
await DashboardService.getOverview(db as any, {} as any, "<tenantId>", query);
```

Run with `cd service && bun <script>.ts`. Pass `env` as `{}` — `resolveIdentities` returns empty maps without `CLERK_SECRET_KEY` and makes no network calls.

## Gotchas

- The frontend "Lifetime" preset sends `from = now − 5y, to = now` AND `lifetime=1` (`app/utils/date-range.ts`). Passing only `lifetime: "1"` makes `resolveWindow` fall back to a 7-day window and silently return near-empty results.
- To exercise filtered paths, insert temp rows with ids like `verify-test-%` via wrangler d1, then `DELETE FROM usage_events WHERE id LIKE 'verify-test-%'` after.
- Before/after comparisons: `git stash` → run harness → `git stash pop` → run again.
- Typecheck: `cd service && bunx tsc -b`.
