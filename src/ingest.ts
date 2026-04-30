import type { RequestScope, VeTrackEvent } from "./types";

let originalFetch: typeof fetch | null = null;

export function captureOriginalFetch(): void {
  if (!originalFetch) originalFetch = globalThis.fetch.bind(globalThis);
}

export async function flushEvents(scope: RequestScope): Promise<void> {
  if (!scope.apiKey || scope.buffer.length === 0) return;

  const events: VeTrackEvent[] = scope.buffer.splice(0);
  const sender = originalFetch ?? globalThis.fetch;

  try {
    await sender(`${scope.baseUrl}/api/v1/events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-ve-key": scope.apiKey,
      },
      body: JSON.stringify({ app: scope.app, events }),
    });
  } catch (err) {
    console.error("[ve-track] flush failed:", err);
  }
}
