import type { RequestScope, VeTrackUser } from "./types.js";
export declare function installFetchHook(): void;
export declare function runScope<T>(scope: RequestScope, handler: () => Promise<T> | T): Promise<T>;
export declare function withUser<T>(user: VeTrackUser, handler: () => Promise<T> | T): Promise<T>;
export declare function withAction<T>(action: string, handler: () => Promise<T> | T): Promise<T>;
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
    correlationId?: string | null;
}
export declare function trackUsage(usage: TrackUsageInput): void;
export interface TrackCreditsInput {
    credits: number;
    action?: string;
    provider?: string;
    creditPriceUsd?: number | null;
    userId?: string | null;
    orgId?: string | null;
    correlationId?: string | null;
}
export declare function trackCredits(input: TrackCreditsInput): void;
/**
 * Ship everything buffered so far, now.
 *
 * Events are normally delivered once, from `runScope`'s `finally`, at the END of
 * the whole scope. That is fine for a short request and WRONG for a long-lived
 * one: a Worker cron that is killed at the platform wall clock, or by an OOM,
 * never runs that `finally`, and every event it buffered dies with the isolate.
 * The work was already done and, if the caller gated it on a database CAS, it
 * will never be re-emitted.
 *
 * Call this at the end of each phase of a long job to make the preceding phase's
 * events durable. Safe to call anywhere: it no-ops outside a scope and when the
 * buffer is empty, and `flushEvents` splices the buffer synchronously, so
 * concurrent flushes cannot double-send.
 */
export declare function flush(): Promise<void>;
export declare function getCurrentScope(): RequestScope | undefined;
//# sourceMappingURL=hook.d.ts.map