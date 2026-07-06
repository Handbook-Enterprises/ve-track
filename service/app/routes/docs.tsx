import { Link } from "react-router";
import DocsHeader from "~/components/common/docs-header";
import SiteFooter from "~/components/common/site-footer";
import CodeBlock from "~/components/common/code-block";
import DocsCopyForLLM from "~/components/common/docs-copy-llm";
import { useScrollSpy } from "~/hooks/useScrollSpy";
import { PROVIDER_LABELS } from "~/utils/providers";
import type { Route } from "./+types/docs";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "ve-track docs · integrate cost attribution" },
    {
      name: "description",
      content:
        "Integrate @viewengine/track in minutes. Install, wrap your handler, and every provider fetch is attributed to your app, org, user, and action.",
    },
  ];
}

const NAV_GROUPS: Array<{ group: string; items: Array<{ id: string; label: string }> }> = [
  {
    group: "Get started",
    items: [
      { id: "overview", label: "Overview" },
      { id: "quickstart", label: "Quickstart" },
    ],
  },
  {
    group: "Guides",
    items: [
      { id: "worker-shapes", label: "Worker shapes" },
      { id: "actions", label: "Tagging actions" },
      { id: "manual-events", label: "Manual events" },
    ],
  },
  {
    group: "Reference",
    items: [
      { id: "configuration", label: "Configuration" },
      { id: "providers", label: "Providers" },
      { id: "identity", label: "Users and orgs" },
    ],
  },
];

const FLAT = NAV_GROUPS.flatMap((g) => g.items);

function P({ children }: { children: React.ReactNode }) {
  return <p className="mt-4 text-[14px] leading-relaxed text-white/65">{children}</p>;
}

function C({ children }: { children: React.ReactNode }) {
  return (
    <code className="border border-white/10 bg-white/[0.05] px-1.5 py-0.5 text-[12.5px] text-[#FF4D00]">
      {children}
    </code>
  );
}

function H3({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mt-10 font-display text-[18px] font-bold uppercase tracking-tight text-white">
      {children}
    </h3>
  );
}

function Section({
  id,
  index,
  title,
  children,
}: {
  id: string;
  index: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-28 border-t border-white/10 py-14 first:border-t-0">
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#FF4D00]">
        {String(index + 1).padStart(2, "0")} // {title}
      </p>
      <h2 className="mt-3 font-display text-[clamp(28px,4vw,40px)] font-bold uppercase leading-[1] tracking-tight">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function Docs(_props: Route.ComponentProps) {
  const active = useScrollSpy(FLAT.map((i) => i.id));

  return (
    <main className="min-h-screen bg-black font-mono text-white antialiased">
      <DocsHeader />

      <div className="mx-auto max-w-[88rem] px-6 pt-28">
        <div className="grid gap-12 lg:grid-cols-[14rem_minmax(0,1fr)_13rem]">
          <aside className="hidden lg:block">
            <div className="sticky top-28 space-y-7">
              {NAV_GROUPS.map((group) => (
                <div key={group.group}>
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/35">
                    {group.group}
                  </p>
                  <ul className="mt-3 space-y-1.5">
                    {group.items.map((item) => (
                      <li key={item.id}>
                        <a
                          href={`#${item.id}`}
                          className={`block border-l-2 py-0.5 pl-3 text-[13px] transition-colors ${
                            active === item.id
                              ? "border-[#FF4D00] text-white"
                              : "border-white/10 text-white/55 hover:border-white/30 hover:text-white/80"
                          }`}
                        >
                          {item.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </aside>

          <article className="min-w-0 max-w-2xl">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-5">
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/40">
                Developer docs
              </p>
              <DocsCopyForLLM />
            </div>
            <Section id="overview" index={0} title="Overview">
              <P>
                ve-track is cost attribution for AI shaped apps. One install, one wrapper
                line, and every provider fetch your app makes is priced and attributed to
                your app, your Clerk org, your end user, and the action they ran. It shows
                up on your dashboard within seconds.
              </P>
              <div className="mt-6 flex flex-wrap gap-2">
                {Object.values(PROVIDER_LABELS).map((p) => (
                  <span
                    key={p}
                    className="border border-white/15 px-2.5 py-1 text-[11px] uppercase tracking-[0.14em] text-white/65"
                  >
                    {p}
                  </span>
                ))}
              </div>
              <P>
                The fastest path is the <a href="#quickstart" className="text-[#FF4D00] hover:underline">Quickstart</a>.
                Already integrated and curious what changed? Pricing and version history live
                in the <C>CHANGELOG</C>.
              </P>
            </Section>

            <Section id="quickstart" index={1} title="Quickstart">
              <P>Four steps, about a minute. No infra to spin up.</P>

              <H3>1. Install</H3>
              <P>Add the package to any Cloudflare Worker, Node, Bun, or Deno project.</P>
              <CodeBlock
                language="bash"
                code={`bun add github:Handbook-Enterprises/ve-track\n# or: npm install github:Handbook-Enterprises/ve-track`}
              />

              <H3>2. Issue a key</H3>
              <P>
                Open <Link to="/dashboard/keys" className="text-[#FF4D00] hover:underline">the Keys page</Link>,
                click New key, and copy the <C>vt_live_…</C> value.
              </P>

              <H3>3. Add two env vars</H3>
              <P>Put these in your worker's .dev.vars, and as secrets in production.</P>
              <CodeBlock
                filename=".dev.vars"
                code={`VE_TRACK_KEY=vt_live_xxxxxxxxxxxxxxxxxxxxxxxx\nVE_TRACK_BASE_URL=https://track.viewengine.ai`}
              />

              <H3>4. Wrap your handler</H3>
              <CodeBlock
                filename="worker.ts"
                code={`import { trackHandler } from "@viewengine/track";\nimport app from "./api";\n\nexport default trackHandler<Env>(\n  { app: "my-app" },\n  {\n    fetch: (req, env, ctx) => app.fetch(req, env, ctx),\n  },\n);`}
              />
              <P>
                That is it. Every external provider fetch is now intercepted, priced,
                attributed to the signed in Clerk user and org, and shipped to your
                dashboard. No Clerk app? Pass <C>resolveUser: "none"</C> to skip user
                attribution.
              </P>
            </Section>

            <Section id="worker-shapes" index={2} title="Worker shapes">
              <P>
                <C>trackHandler</C> wraps any worker entry point. Pick the shape that
                matches yours.
              </P>

              <H3>Plain HTTP</H3>
              <CodeBlock
                language="ts"
                code={`export default trackHandler<Env>(\n  { app: "my-app" },\n  { fetch: (req, env, ctx) => app.fetch(req, env, ctx) },\n);`}
              />

              <H3>Queue</H3>
              <P>
                Wrap each message with <C>trackMessage</C>. The producer stamps auth and
                action on the message body, and ve-track reads them automatically.
              </P>
              <CodeBlock
                language="ts"
                code={`export default trackHandler<Env>(\n  { app: "my-app" },\n  {\n    queue: async (batch, env, ctx) => {\n      await Promise.all(\n        batch.messages.map((message) =>\n          trackMessage(message, async () => {\n            await processOne(message.body, env);\n          }),\n        ),\n      );\n    },\n  },\n);\n\n// producer side:\nawait env.MY_QUEUE.send({\n  ...payload,\n  auth: { userId, orgId },\n  action: "rank-refresh",\n});`}
              />

              <H3>Scheduled and email</H3>
              <P>
                Cron ticks default to <C>action: "scheduled"</C> and email triggers to{" "}
                <C>action: "email"</C>. Wrap with <C>trackAction</C> to give them a real
                name.
              </P>
              <CodeBlock
                language="ts"
                code={`scheduled: async (controller, env, ctx) => {\n  await trackAction("nightly-rebuild", async () => {\n    await rebuildEverything(env);\n  });\n},`}
              />
            </Section>

            <Section id="actions" index={3} title="Tagging actions">
              <P>
                Tagging lets the dashboard tell you what each kind of run costs, for example
                <C>ai-search · $0.014 avg/run</C>. That is the number you base credit prices
                on. Three ways, by precedence.
              </P>
              <H3>Per queue message</H3>
              <CodeBlock language="ts" code={`env.MY_QUEUE.send({ ...payload, action: "ai-search" });`} />
              <H3>Per HTTP block</H3>
              <CodeBlock
                language="ts"
                code={`await trackAction("ai-search", async () => {\n  await openai.chat.completions.create(...);\n});`}
              />
              <H3>Worker shape default</H3>
              <P>
                Untagged work falls back to <C>queue</C>, <C>scheduled</C>, or <C>email</C>{" "}
                based on the entry point.
              </P>
            </Section>

            <Section id="manual-events" index={4} title="Manual events">
              <P>
                Hit a provider the lib does not recognize, or already know the cost? Call{" "}
                <C>trackUsage</C> from inside any tracked scope. It inherits the scope's app,
                user, org, and action. Outside a scope it is a silent no op, so it is safe to
                leave in.
              </P>
              <CodeBlock
                language="ts"
                code={`import { trackUsage } from "@viewengine/track";\n\nconst res = await fetch("https://api.some-provider.com/run", { ... });\nconst body = await res.json();\n\ntrackUsage({\n  provider: "some-provider",\n  costUsd: body.cost,\n  model: body.model,\n  promptTokens: body.usage?.input,\n  completionTokens: body.usage?.output,\n  statusCode: res.status,\n});`}
              />
              <H3>Credits</H3>
              <P>
                Billing your users in credits through Autumn or another credit system? Report
                every deduction with <C>trackCredits</C> and the dashboard breaks credit usage
                down by app, action, user, org, provider, and model, right next to cost. Call
                it after your billing call succeeds. Like <C>trackUsage</C>, it inherits the
                scope's app, user, org, and action, and it is a silent no op outside a scope.
              </P>
              <CodeBlock
                language="ts"
                code={`import { trackCredits } from "@viewengine/track";\n\nconst result = await autumn.track({\n  customerId: user.id,\n  featureId: "ai_search",\n  value: 3,\n});\n\ntrackCredits({\n  credits: 3,\n  action: "ai_search",\n});`}
              />
              <P>
                To attach credits to the same row as the provider call that caused them, pass{" "}
                <C>creditsCharged</C> (and optionally <C>creditPriceUsd</C>) to{" "}
                <C>trackUsage</C> instead. That keeps the deduction on the usage event and
                powers the profitability view.
              </P>
              <P>
                Charging the same credit price across all your apps? Set a default once in{" "}
                <C>Settings → Credits</C> and skip <C>creditPriceUsd</C> everywhere. Credit
                events that arrive without a price pick up the default at ingest. Pass{" "}
                <C>creditPriceUsd</C> only in an app with its own unique pricing, since an
                explicit value always wins over the default.
              </P>
            </Section>

            <Section id="configuration" index={5} title="Configuration">
              <P>
                <C>trackHandler(config, handler)</C> accepts:
              </P>
              <div className="mt-5 overflow-x-auto border border-white/10">
                <table className="w-full border-collapse text-[13px]">
                  <thead>
                    <tr className="border-b border-white/10 text-left text-[10.5px] uppercase tracking-[0.14em] text-white/45">
                      <th className="px-4 py-2.5 font-medium">Field</th>
                      <th className="px-4 py-2.5 font-medium">Default</th>
                      <th className="px-4 py-2.5 font-medium">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="text-white/70">
                    {[
                      ["app", "required", "Stable slug shown on the dashboard, like ve-rank."],
                      ["apiKey", "env.VE_TRACK_KEY", "Override if your secret is named differently."],
                      ["baseUrl", "track.viewengine.ai", "Point at staging or a self hosted instance."],
                      ["resolveUser", '"clerk"', 'Reads the Clerk session. Pass a custom resolver, or "none" to disable.'],
                    ].map(([f, d, n]) => (
                      <tr key={f} className="border-b border-white/5 last:border-b-0">
                        <td className="px-4 py-3 align-top"><C>{f}</C></td>
                        <td className="px-4 py-3 align-top text-white/55">{d}</td>
                        <td className="px-4 py-3 align-top">{n}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <P>Custom resolver for non Clerk auth:</P>
              <CodeBlock
                language="ts"
                code={`trackHandler<Env>(\n  {\n    app: "my-app",\n    resolveUser: async (req, env) => ({\n      userId: parseSession(req)?.userId ?? null,\n      orgId: parseSession(req)?.tenantId ?? null,\n    }),\n  },\n  { fetch: ... },\n);`}
              />
            </Section>

            <Section id="providers" index={6} title="Providers">
              <P>
                These domains are auto detected and priced for you, no config. Token based
                LLMs are priced server side from a live catalog; the rest use the cost the
                provider reports.
              </P>
              <div className="mt-5 grid grid-cols-2 gap-px border border-white/10 bg-white/10 sm:grid-cols-3">
                {[
                  ["OpenAI", "api.openai.com"],
                  ["Anthropic", "api.anthropic.com"],
                  ["Gemini", "generativelanguage.googleapis.com"],
                  ["OpenRouter", "openrouter.ai/api"],
                  ["Perplexity", "api.perplexity.ai"],
                  ["Cloro", "api.cloro.dev"],
                  ["Fal", "fal.run"],
                  ["Zyte", "api.zyte.com"],
                  ["DataForSEO", "api.dataforseo.com"],
                  ["Apify", "api.apify.com"],
                  ["Firecrawl", "api.firecrawl.dev"],
                  ["BrightData", "brightdata.com"],
                ].map(([name, domain]) => (
                  <div key={name} className="bg-black p-4">
                    <p className="text-[13px] font-semibold text-white">{name}</p>
                    <p className="mt-1 truncate text-[11px] text-white/45">{domain}</p>
                  </div>
                ))}
              </div>
              <P>
                Add one with a single entry in <C>src/providers.ts</C>: match the URL,
                optionally enhance the request, and extract the cost and tokens from the
                response.
              </P>
            </Section>

            <Section id="identity" index={7} title="Users and orgs">
              <P>
                With the default <C>resolveUser: "clerk"</C>, ve-track reads the{" "}
                <C>Authorization: Bearer</C> header, verifies it with your{" "}
                <C>CLERK_SECRET_KEY</C>, and attributes the event to that user and org. If
                any step fails the request still runs, the event just is not user attributed.
              </P>
              <P>
                For queue messages, the producer stamps{" "}
                <C>{`body.auth = { userId, orgId }`}</C> on the message and{" "}
                <C>trackMessage</C> picks it up. The dashboard resolves IDs to names server
                side, so you see real people and orgs instead of raw IDs.
              </P>
              <div className="mt-10 border border-white/10 bg-white/[0.02] p-6">
                <p className="font-display text-[18px] font-bold uppercase tracking-tight">
                  Ready to wire it up?
                </p>
                <p className="mt-2 text-[13px] text-white/60">
                  Issue a key and drop the wrapper into your worker.
                </p>
                <Link
                  to="/dashboard/keys"
                  className="mt-5 inline-flex items-center gap-2 bg-white px-5 py-2.5 text-[12px] font-bold uppercase tracking-[0.12em] text-black transition-colors hover:bg-[#FF4D00]"
                >
                  Get a key
                </Link>
              </div>
            </Section>
          </article>

          <aside className="hidden lg:block">
            <div className="sticky top-28">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/35">
                On this page
              </p>
              <ul className="mt-3 space-y-1.5">
                {FLAT.map((item) => (
                  <li key={item.id}>
                    <a
                      href={`#${item.id}`}
                      className={`block text-[12px] transition-colors ${
                        active === item.id
                          ? "text-[#FF4D00]"
                          : "text-white/45 hover:text-white/75"
                      }`}
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </div>

      <SiteFooter />
    </main>
  );
}
