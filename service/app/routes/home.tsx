import type { Route } from "./+types/home";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "ve-track · ViewEngine cost attribution" },
    {
      name: "description",
      content:
        "Multi-tenant cost attribution service. Apps install @viewengine/track and ship every provider fetch over HTTP to be attributed and aggregated.",
    },
  ];
}

export function loader(_args: Route.LoaderArgs) {
  return { ok: true };
}

const PROVIDERS = [
  "openrouter",
  "openai",
  "anthropic",
  "zyte",
  "dataforseo",
  "apify",
  "firecrawl",
];

const PUBLIC_ENDPOINTS = [
  { method: "POST", path: "/api/v1/events" },
  { method: "GET", path: "/api/v1/usage/by-app" },
  { method: "GET", path: "/api/v1/usage/by-org" },
  { method: "GET", path: "/api/v1/usage/by-user" },
  { method: "GET", path: "/api/v1/usage/by-provider" },
  { method: "GET", path: "/api/v1/usage/by-model" },
  { method: "GET", path: "/api/v1/usage/totals" },
  { method: "POST", path: "/api/v1/canary" },
];

const ADMIN_ENDPOINTS = [
  { method: "POST", path: "/api/admin/tenants" },
  { method: "GET", path: "/api/admin/tenants" },
  { method: "POST", path: "/api/admin/tenants/:id/keys" },
  { method: "GET", path: "/api/admin/tenants/:id/keys" },
  { method: "DELETE", path: "/api/admin/keys/:id" },
];

export default function Home(_props: Route.ComponentProps) {
  return (
    <main className="min-h-screen bg-white px-6 py-16 text-zinc-900">
      <div className="mx-auto max-w-2xl space-y-10">
        <header className="space-y-2 border-b-2 border-zinc-900 pb-6">
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-500">
            ViewEngine · Cost Attribution Service
          </p>
          <h1 className="text-3xl font-medium tracking-tight">ve-track</h1>
          <p className="text-sm text-zinc-600">
            One SDK, every provider, every app. Drop{" "}
            <code className="bg-zinc-100 px-1">@viewengine/track</code> into a
            Worker, pass an API key, and every fetch to a known provider is
            attributed to your tenant — visible on the dashboard within
            seconds.
          </p>
        </header>

        <section className="space-y-3">
          <h2 className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500">
            Install
          </h2>
          <pre className="overflow-x-auto bg-zinc-50 p-3 text-xs">
{`bun add github:Handbook-Enterprises/ve-track`}
          </pre>
          <pre className="overflow-x-auto bg-zinc-50 p-3 text-xs">
{`import { trackedHandler, clerkUserResolver } from "@viewengine/track";
import app from "./api/app";

export default trackedHandler<Env>({
  app: "ve-fanout",
  resolveUser: clerkUserResolver,
  fetch: (req, env, ctx) => app.fetch(req, env, ctx),
});`}
          </pre>
        </section>

        <section className="space-y-3">
          <h2 className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500">
            Tracked Providers
          </h2>
          <div className="flex flex-wrap gap-2">
            {PROVIDERS.map((p) => (
              <span
                key={p}
                className="border border-zinc-300 px-2 py-0.5 text-xs"
              >
                {p}
              </span>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500">
            Public API · auth: x-ve-key header
          </h2>
          <ul className="space-y-1 font-mono text-xs">
            {PUBLIC_ENDPOINTS.map((e) => (
              <li key={e.path} className="flex gap-3">
                <span className="w-14 text-zinc-500">{e.method}</span>
                <span>{e.path}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500">
            Admin API · auth: Bearer ADMIN_API_KEY
          </h2>
          <ul className="space-y-1 font-mono text-xs">
            {ADMIN_ENDPOINTS.map((e) => (
              <li key={e.path} className="flex gap-3">
                <span className="w-14 text-zinc-500">{e.method}</span>
                <span>{e.path}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500">
            Pipeline
          </h2>
          <ol className="list-decimal space-y-1 pl-4 text-sm text-zinc-700">
            <li>App calls a provider; SDK auto-attributes and buffers events.</li>
            <li>SDK POSTs the buffered events to /api/v1/events with the tenant API key.</li>
            <li>ve-track stamps tenant_id and writes to D1 usage_events.</li>
            <li>Dashboards (or your own queries) read tenant-scoped aggregates.</li>
          </ol>
        </section>
      </div>
    </main>
  );
}
