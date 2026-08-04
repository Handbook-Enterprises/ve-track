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
export declare function getCurrentScope(): RequestScope | undefined;
//# sourceMappingURL=hook.d.ts.map