import { AsyncLocalStorage } from "node:async_hooks";
import { PROVIDERS } from "./providers.js";
import { captureOriginalFetch, flushEvents } from "./ingest.js";
const requestContext = new AsyncLocalStorage();
const runExtract = async (provider, response) => {
    const clone = response.clone();
    try {
        return await provider.extract(clone);
    }
    catch {
        return null;
    }
    finally {
        if (!clone.bodyUsed) {
            await clone.body?.cancel().catch(() => { });
        }
    }
};
const backfillIdentity = async (scope) => {
    const events = scope.unattributed;
    if (!scope.resolveIdentity || !events || events.length === 0)
        return;
    const user = await scope.resolveIdentity().catch(() => null);
    scope.resolveIdentity = undefined;
    if (!user)
        return;
    for (const event of events) {
        if (event.clerk_user_id === null)
            event.clerk_user_id = user.userId;
        if (event.clerk_org_id === null)
            event.clerk_org_id = user.orgId;
    }
    events.length = 0;
};
let installed = false;
export function installFetchHook() {
    if (installed)
        return;
    installed = true;
    captureOriginalFetch();
    const originalFetch = globalThis.fetch.bind(globalThis);
    globalThis.fetch = (async (input, init) => {
        const url = typeof input === "string"
            ? input
            : input instanceof URL
                ? input.toString()
                : input.url;
        const provider = PROVIDERS.find((p) => p.match(url));
        if (!provider)
            return originalFetch(input, init);
        const scope = requestContext.getStore();
        if (!scope) {
            return originalFetch(input, init);
        }
        if (scope.resolveIdentity) {
            const user = await scope.resolveIdentity();
            scope.userId = user.userId;
            scope.orgId = user.orgId;
            scope.resolveIdentity = undefined;
        }
        const mutableInit = init ?? {};
        provider.enhance?.(mutableInit, scope.app, {
            userId: scope.userId,
            orgId: scope.orgId,
        });
        const start = Date.now();
        const response = await originalFetch(input, mutableInit);
        const latencyMs = Date.now() - start;
        const contentLength = Number(response.headers.get("content-length"));
        const skipExtract = typeof scope.maxExtractBytes === "number" &&
            Number.isFinite(contentLength) &&
            contentLength > scope.maxExtractBytes;
        const extractTask = (async () => {
            const usage = skipExtract ? null : await runExtract(provider, response);
            const event = {
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
    });
}
export function runScope(scope, handler) {
    if (!scope.pending)
        scope.pending = [];
    if (!scope.unattributed)
        scope.unattributed = [];
    if (scope.action === undefined)
        scope.action = null;
    return requestContext.run(scope, async () => {
        try {
            return await Promise.resolve(handler());
        }
        finally {
            scope.ctx.waitUntil((async () => {
                await Promise.allSettled(scope.pending);
                await backfillIdentity(scope);
                await flushEvents(scope);
            })());
        }
    });
}
export function withUser(user, handler) {
    const scope = requestContext.getStore();
    if (!scope)
        return Promise.resolve(handler());
    const childScope = {
        ...scope,
        userId: user.userId,
        orgId: user.orgId,
        resolveIdentity: undefined,
    };
    return Promise.resolve(requestContext.run(childScope, handler));
}
export function withAction(action, handler) {
    const scope = requestContext.getStore();
    if (!scope)
        return Promise.resolve(handler());
    const childScope = { ...scope, action };
    return Promise.resolve(requestContext.run(childScope, handler));
}
export function trackUsage(usage) {
    const scope = requestContext.getStore();
    if (!scope)
        return;
    const event = {
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
        correlation_id: usage.correlationId ?? null,
    };
    scope.buffer.push(event);
    if (scope.resolveIdentity && usage.userId === undefined && usage.orgId === undefined) {
        scope.unattributed?.push(event);
    }
}
export function trackCredits(input) {
    const scope = requestContext.getStore();
    if (!scope)
        return;
    if (typeof input.credits !== "number" || !Number.isFinite(input.credits))
        return;
    const event = {
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
        correlation_id: input.correlationId ?? null,
    };
    scope.buffer.push(event);
    if (scope.resolveIdentity && input.userId === undefined && input.orgId === undefined) {
        scope.unattributed?.push(event);
    }
}
export function getCurrentScope() {
    return requestContext.getStore();
}
//# sourceMappingURL=hook.js.map