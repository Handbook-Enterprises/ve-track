import { AsyncLocalStorage } from "node:async_hooks";
import { PROVIDERS } from "./providers";
import { captureOriginalFetch, flushEvents } from "./ingest";
import type { RequestScope, VeTrackEvent, VeTrackUser } from "./types";

const requestContext = new AsyncLocalStorage<RequestScope>();

let installed = false;

export function installFetchHook(): void {
  if (installed) return;
  installed = true;
  captureOriginalFetch();

  const originalFetch = globalThis.fetch.bind(globalThis);

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : (input as Request).url;

    const provider = PROVIDERS.find((p) => p.match(url));
    if (!provider) return originalFetch(input, init);

    const scope = requestContext.getStore();
    if (!scope) {
      return originalFetch(input, init);
    }

    const mutableInit: RequestInit = init ?? {};
    provider.enhance?.(mutableInit, scope.app, {
      userId: scope.userId,
      orgId: scope.orgId,
    });

    const start = Date.now();
    const response = await originalFetch(input, mutableInit);
    const latencyMs = Date.now() - start;

    const extractTask = (async () => {
      const usage = await provider
        .extract(response.clone())
        .catch(() => null);

      const event: VeTrackEvent = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        app: scope.app,
        clerk_user_id: scope.userId,
        clerk_org_id: scope.orgId,
        action: scope.action,
        provider: provider.name,
        model: usage?.model ?? null,
        prompt_tokens: usage?.promptTokens ?? null,
        completion_tokens: usage?.completionTokens ?? null,
        cached_input_tokens: usage?.cachedInputTokens ?? null,
        cache_write_tokens: usage?.cacheWriteTokens ?? null,
        reasoning_tokens: usage?.reasoningTokens ?? null,
        latency_ms: latencyMs,
        cost_usd: usage?.costUsd ?? null,
        status_code: response.status,
      };

      scope.buffer.push(event);
    })();

    scope.pending.push(extractTask);
    scope.ctx.waitUntil(extractTask);

    return response;
  }) as typeof fetch;
}

export function runScope<T>(
  scope: RequestScope,
  handler: () => Promise<T> | T,
): Promise<T> {
  if (!scope.pending) scope.pending = [];
  if (scope.action === undefined) scope.action = null;
  return requestContext.run(scope, async () => {
    try {
      return await Promise.resolve(handler());
    } finally {
      scope.ctx.waitUntil(
        (async () => {
          await Promise.allSettled(scope.pending);
          await flushEvents(scope);
        })(),
      );
    }
  });
}

export function withUser<T>(
  user: VeTrackUser,
  handler: () => Promise<T> | T,
): Promise<T> {
  const scope = requestContext.getStore();
  if (!scope) return Promise.resolve(handler());
  const childScope: RequestScope = {
    ...scope,
    userId: user.userId,
    orgId: user.orgId,
  };
  return Promise.resolve(requestContext.run(childScope, handler));
}

export function withAction<T>(
  action: string,
  handler: () => Promise<T> | T,
): Promise<T> {
  const scope = requestContext.getStore();
  if (!scope) return Promise.resolve(handler());
  const childScope: RequestScope = { ...scope, action };
  return Promise.resolve(requestContext.run(childScope, handler));
}

export interface TrackUsageInput {
  provider: string;
  costUsd?: number | null;
  model?: string | null;
  promptTokens?: number | null;
  completionTokens?: number | null;
  cachedInputTokens?: number | null;
  cacheWriteTokens?: number | null;
  reasoningTokens?: number | null;
  latencyMs?: number | null;
  statusCode?: number | null;
  action?: string;
  userId?: string | null;
  orgId?: string | null;
  creditsCharged?: number | null;
  creditPriceUsd?: number | null;
}

export function trackUsage(usage: TrackUsageInput): void {
  const scope = requestContext.getStore();
  if (!scope) return;
  const event: VeTrackEvent = {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    app: scope.app,
    clerk_user_id: usage.userId !== undefined ? usage.userId : scope.userId,
    clerk_org_id: usage.orgId !== undefined ? usage.orgId : scope.orgId,
    action: usage.action ?? scope.action,
    provider: usage.provider,
    model: usage.model ?? null,
    prompt_tokens: usage.promptTokens ?? null,
    completion_tokens: usage.completionTokens ?? null,
    cached_input_tokens: usage.cachedInputTokens ?? null,
    cache_write_tokens: usage.cacheWriteTokens ?? null,
    reasoning_tokens: usage.reasoningTokens ?? null,
    latency_ms: usage.latencyMs ?? null,
    cost_usd: usage.costUsd ?? null,
    status_code: usage.statusCode ?? null,
    credits_charged: usage.creditsCharged ?? null,
    credit_price_usd_at_event: usage.creditPriceUsd ?? null,
  };
  scope.buffer.push(event);
}

export interface TrackCreditsInput {
  credits: number;
  action?: string;
  provider?: string;
  creditPriceUsd?: number | null;
  userId?: string | null;
  orgId?: string | null;
}

export function trackCredits(input: TrackCreditsInput): void {
  const scope = requestContext.getStore();
  if (!scope) return;
  if (typeof input.credits !== "number" || !Number.isFinite(input.credits))
    return;
  const event: VeTrackEvent = {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    app: scope.app,
    clerk_user_id: input.userId !== undefined ? input.userId : scope.userId,
    clerk_org_id: input.orgId !== undefined ? input.orgId : scope.orgId,
    action: input.action ?? scope.action,
    provider: input.provider ?? "autumn",
    model: null,
    prompt_tokens: null,
    completion_tokens: null,
    cached_input_tokens: null,
    cache_write_tokens: null,
    reasoning_tokens: null,
    latency_ms: null,
    cost_usd: null,
    status_code: null,
    credits_charged: input.credits,
    credit_price_usd_at_event: input.creditPriceUsd ?? null,
  };
  scope.buffer.push(event);
}

export function getCurrentScope(): RequestScope | undefined {
  return requestContext.getStore();
}
