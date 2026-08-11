import { describe, expect, it } from "bun:test";
import { runScope, trackCredits, trackUsage } from "../src/hook.ts";
import type { RequestScope, VeTrackEvent } from "../src/types.ts";

describe("manual usage events", () => {
  it("carries explicit provenance and leaves an unknown manual source unstated", async () => {
    const buffer: VeTrackEvent[] = [];
    const scope = {
      ctx: { waitUntil() {} },
      app: "test-app",
      apiKey: undefined,
      baseUrl: "https://track.example",
      userId: null,
      orgId: null,
      action: null,
      buffer,
      pending: [],
    } as unknown as RequestScope;

    await runScope(scope, () => {
      trackUsage({
        provider: "manual-vendor",
        costUsd: 1.25,
        costSource: "vendor_stated",
      });
      trackUsage({ provider: "manual-unknown", costUsd: 2.5 });
      trackCredits({ credits: 3 });
    });

    expect(buffer[0].cost_source).toBe("vendor_stated");
    expect(buffer[1].cost_source).toBeUndefined();
    expect(buffer[2].cost_source).toBeUndefined();
  });
});
