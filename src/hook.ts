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

  globalThis.fetch = (async (
    input: RequestInfo | URL,
    init?: RequestInit,
  ) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : (input as Request).url;

    const provider = PROVIDERS.find((p) => p.match(url));
    if (!provider) return originalFetch(input, init);

    const scope = requestContext.getStore();
    if (!scope) return originalFetch(input, init);

    const mutableInit: RequestInit = init ?? {};
    provider.enhance?.(mutableInit, scope.app, {
      userId: scope.userId,
      orgId: scope.orgId,
    });

    const start = Date.now();
    const response = await originalFetch(input, mutableInit);
    const latencyMs = Date.now() - start;

    scope.ctx.waitUntil(
      (async () => {
        const usage = await provider
          .extract(response.clone())
          .catch(() => null);

        const event: VeTrackEvent = {
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          app: scope.app,
          clerk_user_id: scope.userId,
          clerk_org_id: scope.orgId,
          provider: provider.name,
          model: usage?.model ?? null,
          prompt_tokens: usage?.promptTokens ?? null,
          completion_tokens: usage?.completionTokens ?? null,
          latency_ms: latencyMs,
          cost_usd: usage?.costUsd ?? null,
          status_code: response.status,
        };

        scope.buffer.push(event);
      })(),
    );

    return response;
  }) as typeof fetch;
}

export function runScope<T>(
  scope: RequestScope,
  handler: () => Promise<T> | T,
): Promise<T> {
  return requestContext.run(scope, async () => {
    try {
      return await Promise.resolve(handler());
    } finally {
      scope.ctx.waitUntil(flushEvents(scope));
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

export function getCurrentScope(): RequestScope | undefined {
  return requestContext.getStore();
}
