import type { RequestScope } from "./types.js";
export declare function captureOriginalFetch(): void;
export declare const AUTO_FLUSH_AT = 50;
export declare function maybeAutoFlush(scope: RequestScope): void;
export declare function flushEvents(scope: RequestScope): Promise<void>;
//# sourceMappingURL=ingest.d.ts.map