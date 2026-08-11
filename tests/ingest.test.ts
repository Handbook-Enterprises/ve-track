import { afterEach, describe, expect, it, mock, spyOn } from "bun:test";
import { flushEvents } from "../src/ingest.ts";

const originalFetch = globalThis.fetch;

const event = () => ({
  id: "event-1",
  timestamp: 1_700_000_000_000,
  app: "test-app",
  clerk_user_id: null,
  clerk_org_id: null,
  action: null,
  provider: "openai",
  model: "gpt-5",
  prompt_tokens: 10,
  completion_tokens: 5,
  cached_input_tokens: 0,
  cache_write_tokens: null,
  reasoning_tokens: 0,
  latency_ms: 12,
  cost_usd: 0.001,
  status_code: 200,
});

const scope = () => ({
  ctx: { waitUntil() {} },
  app: "test-app",
  apiKey: "ve_test_key",
  baseUrl: "https://track.example",
  userId: null,
  orgId: null,
  action: null,
  buffer: [event()],
  pending: [],
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  mock.restore();
});

describe("flushEvents", () => {
  it("logs a rejected ingest with the HTTP status, lost count, and response detail", async () => {
    const fetchMock = mock(async () => new Response("revoked API key", { status: 401 }));
    globalThis.fetch = fetchMock;
    const errorSpy = spyOn(console, "error").mockImplementation(() => {});
    const requestScope = scope();

    await flushEvents(requestScope);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://track.example/api/v1/events");
    expect(init.method).toBe("POST");
    expect(new Headers(init.headers).get("x-ve-key")).toBe("ve_test_key");
    expect(JSON.parse(init.body)).toEqual({ app: "test-app", events: [event()] });
    expect(requestScope.buffer).toEqual([]);
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy.mock.calls[0].join(" ")).toContain("HTTP 401");
    expect(errorSpy.mock.calls[0].join(" ")).toContain("1 event(s) lost");
    expect(errorSpy.mock.calls[0].join(" ")).toContain("revoked API key");
  });

  it("does not log a successful ingest as rejected", async () => {
    const fetchMock = mock(async () => new Response(null, { status: 204 }));
    globalThis.fetch = fetchMock;
    const errorSpy = spyOn(console, "error").mockImplementation(() => {});

    await flushEvents(scope());

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(errorSpy).not.toHaveBeenCalled();
  });
});
