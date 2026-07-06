# Product

## Register

product

## Users

Developers and founders running AI powered apps (Cloudflare Workers first) who bill their users in credits and pay providers like OpenAI and Anthropic. They integrate the `@viewengine/track` SDK, then live in the ve-track dashboard to answer "what does each app, action, user, and org cost me, and am I profitable?" They are technical, fluent in tools like Stripe, Axiom, and Cloudflare dashboards, and are usually mid task when they open a screen.

## Product Purpose

ve-track is usage, cost, and profitability tracking for AI apps: an ingest SDK, a Hono/D1 backend, and a React Router dashboard. Success is a developer trusting the numbers enough to price their credits and catch margin problems without building their own analytics.

## Brand Personality

Precise, honest, industrial. ViewEngine brand: orange `#fd5200` primary, cream/dark surfaces, square corners, uppercase tracked section labels, dense but legible data surfaces.

## Anti-references

Not a playful consumer SaaS, not glassmorphism, not gradient heavy marketing chrome inside the app. No decorative motion in the dashboard; motion conveys state only.

## Design Principles

1. Numbers first: every screen exists to make a cost or revenue figure trustworthy and comparable.
2. Earned familiarity: standard controls (shadcn) tuned to the brand; nothing invents affordances for standard tasks.
3. Zero states teach: an empty metric says what would fill it, not just "None".
4. Ship safe: the product is live; defaults and migrations must never silently change existing tenants' numbers.

## Accessibility & Inclusion

WCAG AA contrast targets, keyboard reachable controls, `aria-live` for async save feedback, reduced motion respected (state changes fall back to instant/crossfade).
