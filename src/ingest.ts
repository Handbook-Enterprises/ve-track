import type { RequestScope, VeTrackEvent } from "./types.js";

let originalFetch: typeof fetch | null = null;

export function captureOriginalFetch(): void {
  if (!originalFetch) originalFetch = globalThis.fetch.bind(globalThis);
}

export const AUTO_FLUSH_AT = 50;

export function maybeAutoFlush(scope: RequestScope): void {
  if (scope.buffer.length < AUTO_FLUSH_AT) return;
  // Never ship while identity is still unresolved. `backfillIdentity` patches
  // buffered events in place once the resolver runs; anything flushed before
  // that goes out with a null user/org and cannot be corrected afterwards.
  // Scopes that resolve lazily wait for the end-of-scope flush instead.
  if (scope.resolveIdentity) return;
  const task = flushEvents(scope);
  scope.pending?.push(task);
  try {
    scope.ctx.waitUntil(task);
  } catch {
    /* */
  }
}

export async function flushEvents(scope: RequestScope): Promise<void> {
  if (!scope.apiKey) {
    return;
  }
  if (scope.buffer.length === 0) {
    return;
  }

  const events: VeTrackEvent[] = scope.buffer.splice(0);
  const sender = originalFetch ?? globalThis.fetch;
  const url = `${scope.baseUrl}/api/v1/events`;

  try {
    const res = await sender(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-ve-key": scope.apiKey,
      },
      body: JSON.stringify({ app: scope.app, events }),
    });
    await res.text().catch(() => "<unreadable>");
  } catch (err) {
    console.error("[ve-track][ingest] flush failed:", err);
  }
}
