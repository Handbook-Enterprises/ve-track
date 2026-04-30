import { useEffect, useState } from "react";
import { Link } from "react-router";
import type { Route } from "./+types/home";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "ve-track · cost attribution for AI apps" },
    {
      name: "description",
      content:
        "One SDK. Every provider. Every app. Drop @viewengine/track into any Worker, pass an API key, and watch every fetch get attributed to the right tenant in real time.",
    },
  ];
}

const PROVIDERS = [
  "OpenRouter",
  "OpenAI",
  "Anthropic",
  "Zyte",
  "DataForSEO",
  "Apify",
  "Firecrawl",
];

const STEPS = [
  {
    num: "01",
    title: "Install",
    desc: "Add @viewengine/track to any Cloudflare Worker, Node, Bun, or Deno project. Two lines of imports, no infra to spin up.",
    code: "bun add github:Handbook-Enterprises/ve-track",
  },
  {
    num: "02",
    title: "Wrap your handler",
    desc: "One factory call replaces your default export. Every fetch() to a known provider is auto-attributed from then on.",
    code: 'export default trackedHandler({\n  app: "my-app",\n  resolveUser: clerkUserResolver,\n  fetch: handler.fetch,\n});',
  },
  {
    num: "03",
    title: "Watch the dashboard",
    desc: "Per-app, per-org, per-user, per-provider, per-model. Live aggregates, no setup. Cost goes from invisible to obvious.",
    code: "track.viewengine.ai/dashboard",
  },
];

const PRICING_TIERS = [
  {
    eyebrow: "FREE TIER",
    title: "100k",
    subtitle: "events / month",
    bullets: [
      "All 7 providers tracked",
      "Per-app · per-org · per-user attribution",
      "Real-time dashboard",
      "Unlimited API keys",
    ],
    cta: "Start free",
    primary: false,
  },
  {
    eyebrow: "GROWTH",
    title: "Pay",
    subtitle: "as you scale",
    bullets: [
      "Unlimited events",
      "90-day retention",
      "Webhook alerts on cost spikes",
      "Priority support",
    ],
    cta: "Talk to us",
    primary: true,
  },
];

export default function Home(_props: Route.ComponentProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <main className="min-h-screen bg-black font-mono text-white antialiased">
      <Nav scrolled={scrolled} />

      <Hero />
      <Metrics />
      <HowItWorks />
      <Pricing />
      <Footer />
    </main>
  );
}

function Nav({ scrolled }: { scrolled: boolean }) {
  return (
    <nav
      className={`fixed inset-x-0 top-0 z-50 flex items-center justify-between border-b px-8 py-5 backdrop-blur-md transition-colors ${
        scrolled
          ? "border-white/10 bg-black/80"
          : "border-transparent bg-transparent"
      }`}
    >
      <Link to="/" className="flex items-center gap-3">
        <div className="h-3 w-3 rounded-full bg-[#FF4D00]" />
        <span className="font-display text-lg font-bold uppercase tracking-tight">
          ve-track
        </span>
      </Link>
      <div className="hidden items-center gap-10 md:flex">
        {[
          ["#how", "How it works"],
          ["#providers", "Providers"],
          ["#pricing", "Pricing"],
        ].map(([href, label]) => (
          <a
            key={href}
            href={href}
            className="text-xs uppercase tracking-[0.18em] text-white/60 transition-colors hover:text-[#FF4D00]"
          >
            {label}
          </a>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <Link
          to="/sign-in"
          className="text-xs uppercase tracking-[0.18em] text-white/70 transition-colors hover:text-white"
        >
          Sign in
        </Link>
        <Link
          to="/sign-up"
          className="border border-white bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-black transition-colors hover:border-[#FF4D00] hover:bg-[#FF4D00] hover:text-black"
        >
          Get started
        </Link>
      </div>
    </nav>
  );
}

function Hero() {
  return (
    <header
      id="hero"
      className="relative flex min-h-[90vh] flex-col justify-center overflow-hidden border-b border-white/10 px-6 pt-32"
    >
      <div
        className="absolute inset-0 z-0 opacity-50"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
          maskImage:
            "radial-gradient(circle at center, black 40%, transparent 100%)",
        }}
      />

      <div className="relative z-10 mx-auto w-full max-w-7xl">
        <p className="mb-4 text-xs uppercase tracking-[0.2em] text-[#FF4D00]">
          v0.1.0 · live
        </p>
        <h1 className="font-display text-[clamp(56px,11vw,168px)] font-bold uppercase leading-[0.95] tracking-[-0.03em]">
          Where did
          <br />
          the spend
          <br />
          actually go?
        </h1>
        <p className="mt-8 max-w-xl border-l-2 border-[#FF4D00] pl-6 text-base text-white/70 sm:text-lg">
          Drop one SDK into any worker. Every call to OpenRouter, OpenAI,
          Anthropic, Zyte, DataForSEO, Apify, or Firecrawl is auto-attributed
          to the right app, org, and user — visible on a live dashboard within
          seconds.
        </p>
        <div className="mt-12 flex flex-wrap gap-4">
          <Link
            to="/sign-up"
            className="inline-flex items-center gap-2 bg-white px-6 py-3 text-sm font-bold uppercase tracking-[0.12em] text-black transition-transform hover:-translate-y-0.5 hover:bg-[#FF4D00]"
          >
            Start free
            <span aria-hidden>→</span>
          </Link>
          <a
            href="#how"
            className="inline-flex items-center gap-2 border border-white px-6 py-3 text-sm font-bold uppercase tracking-[0.12em] text-white transition-colors hover:border-[#FF4D00] hover:text-[#FF4D00]"
          >
            See how it works
          </a>
        </div>
      </div>
    </header>
  );
}

function Metrics() {
  const cards = [
    {
      label: "Providers tracked",
      value: "7",
      delta: "OpenRouter, OpenAI, Anthropic …",
    },
    {
      label: "Lines to integrate",
      value: "1",
      delta: "trackedHandler() wraps everything",
    },
    {
      label: "Time to first event",
      value: "< 1s",
      delta: "ctx.waitUntil flushes async",
    },
    {
      label: "Vendor lock-in",
      value: "0",
      delta: "Self-host the worker if you want",
    },
  ];

  return (
    <section
      id="providers"
      className="border-b border-white/10 px-6 py-32"
    >
      <div className="mx-auto grid max-w-7xl gap-px border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div
            key={c.label}
            className="group bg-black p-10 transition-colors hover:bg-white/[0.02]"
          >
            <p className="text-[11px] uppercase tracking-[0.18em] text-white/50">
              {c.label}
            </p>
            <p className="mt-4 font-display text-5xl font-bold tabular-nums transition-colors group-hover:text-[#FF4D00]">
              {c.value}
            </p>
            <p className="mt-2 text-xs text-[#FF4D00]/80">{c.delta}</p>
          </div>
        ))}
      </div>

      <div className="mx-auto mt-12 flex max-w-7xl flex-wrap items-center justify-center gap-3">
        {PROVIDERS.map((p) => (
          <span
            key={p}
            className="border border-white/15 px-3 py-1 text-xs uppercase tracking-[0.16em] text-white/70"
          >
            {p}
          </span>
        ))}
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section id="how" className="border-b border-white/10">
      <div className="mx-auto max-w-7xl px-6 py-24 text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-[#FF4D00]">
          03 // how it works
        </p>
        <h2 className="mt-3 font-display text-[clamp(36px,5vw,72px)] font-bold uppercase leading-[0.95] tracking-[-0.02em]">
          Two imports.
          <br />
          One wrap. Done.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-sm text-white/60">
          Cost attribution that ships in the time it takes to commit a PR.
        </p>
      </div>

      <div className="grid border-t border-white/10 md:grid-cols-3">
        {STEPS.map((s, i) => (
          <div
            key={s.num}
            className={`p-12 ${
              i !== STEPS.length - 1 ? "border-b md:border-b-0 md:border-r" : ""
            } border-white/10 ${i === 1 ? "bg-white/[0.02]" : "bg-black"}`}
          >
            <p className="font-display text-5xl font-bold leading-none text-[#FF4D00]">
              {s.num}
            </p>
            <h3 className="mt-6 font-display text-2xl font-bold uppercase tracking-tight">
              {s.title}
            </h3>
            <p className="mt-3 text-sm text-white/60">{s.desc}</p>
            <pre className="mt-6 overflow-x-auto border border-white/10 bg-black/50 p-4 text-[11px] leading-relaxed text-white/80">
              {s.code}
            </pre>
            <div className="mt-6 h-0.5 w-12 bg-[#FF4D00]" />
          </div>
        ))}
      </div>
    </section>
  );
}

function Pricing() {
  return (
    <section id="pricing" className="border-b border-white/10 px-6 py-28">
      <div className="mx-auto max-w-5xl text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-[#FF4D00]">
          04 // pricing
        </p>
        <h2 className="mt-3 font-display text-[clamp(36px,5vw,72px)] font-bold uppercase leading-[0.95] tracking-[-0.02em]">
          Free until
          <br />
          it really matters.
        </h2>
        <p className="mx-auto mt-4 max-w-md text-sm text-white/60">
          Start free. Pay only when you cross 100k events / month.
        </p>
      </div>

      <div className="mx-auto mt-16 grid max-w-4xl gap-px border border-white/10 bg-white/10 md:grid-cols-2">
        {PRICING_TIERS.map((tier) => (
          <div
            key={tier.eyebrow}
            className={`flex flex-col p-12 ${tier.primary ? "bg-white/[0.03]" : "bg-black"}`}
          >
            <p className="text-xs uppercase tracking-[0.18em] text-[#FF4D00]">
              {tier.eyebrow}
            </p>
            <p className="mt-6 font-display text-7xl font-bold leading-none">
              {tier.title}
            </p>
            <p className="mt-2 text-sm text-white/60">{tier.subtitle}</p>
            <ul className="mt-8 space-y-3">
              {tier.bullets.map((b) => (
                <li key={b} className="flex gap-3 text-sm">
                  <span className="text-[#FF4D00]">✓</span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
            <div className="mt-auto pt-10">
              <Link
                to={tier.primary ? "/sign-up" : "/sign-up"}
                className={`block w-full px-6 py-3 text-center text-sm font-bold uppercase tracking-[0.12em] transition-colors ${
                  tier.primary
                    ? "bg-[#FF4D00] text-black hover:bg-white"
                    : "bg-white text-black hover:bg-[#FF4D00]"
                }`}
              >
                {tier.cta}
              </Link>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="px-6 py-16">
      <div className="mx-auto flex max-w-7xl flex-wrap items-start justify-between gap-12 border-t border-white/10 pt-12">
        <div>
          <h4 className="font-display text-xl font-bold uppercase tracking-tight">
            ve-track
          </h4>
          <p className="mt-3 max-w-xs text-xs text-white/50">
            The cost attribution layer for AI-shaped apps. Built by ViewEngine.
          </p>
        </div>
        <div className="flex flex-wrap gap-8 text-xs uppercase tracking-[0.16em] text-white/50">
          <a href="#how" className="hover:text-[#FF4D00]">
            How it works
          </a>
          <a href="#providers" className="hover:text-[#FF4D00]">
            Providers
          </a>
          <a href="#pricing" className="hover:text-[#FF4D00]">
            Pricing
          </a>
          <Link to="/sign-in" className="hover:text-[#FF4D00]">
            Sign in
          </Link>
        </div>
      </div>
      <div className="mx-auto mt-8 flex max-w-7xl items-center justify-between text-[11px] uppercase tracking-[0.16em] text-white/30">
        <span>© 2026 ViewEngine Inc.</span>
        <span>System online · scanning</span>
      </div>
    </footer>
  );
}
