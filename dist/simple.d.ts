import type { UserResolver } from "./types.js";
export interface TrackConfig<E> {
    app: string;
    apiKey?: string | ((env: E) => string | undefined);
    baseUrl?: string;
    resolveUser?: "clerk" | "none" | UserResolver<E>;
    maxExtractBytes?: number;
}
export declare function trackHandler<E>(config: TrackConfig<E>, handler: ExportedHandler<E>): ExportedHandler<E>;
export declare function trackMessage<T>(message: {
    body?: unknown;
}, fn: () => Promise<T> | T): Promise<T>;
export { withAction as trackAction } from "./hook.js";
//# sourceMappingURL=simple.d.ts.map