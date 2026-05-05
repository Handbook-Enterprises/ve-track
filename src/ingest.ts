import type { RequestScope, VeTrackEvent } from "./types";

let originalFetch: typeof fetch | null = null;

export function captureOriginalFetch(): void {
  if (!originalFetch) originalFetch = globalThis.fetch.bind(globalThis);
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
