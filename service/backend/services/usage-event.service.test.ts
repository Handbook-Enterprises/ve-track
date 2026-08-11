// @ts-expect-error Bun provides this runtime module; the service does not install Bun type declarations.
import { afterEach, describe, expect, it, mock, spyOn } from "bun:test";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import type { UsageEventInput } from "../interfaces/usage-event.interface";
import { UsageEventRepository } from "../repositories/usage-event.repository";
import PricingService from "./pricing.service";
import UsageEventService from "./usage-event.service";

type InsertManyArgs = Parameters<typeof UsageEventRepository.insertMany>;

const event = (overrides: Partial<UsageEventInput>): UsageEventInput => ({
  id: overrides.id ?? crypto.randomUUID(),
  timestamp: 1_700_000_000_000,
  clerk_user_id: null,
  clerk_org_id: null,
  action: null,
  provider: "dataforseo",
  model: null,
  prompt_tokens: null,
  completion_tokens: null,
  latency_ms: null,
  cost_usd: null,
  status_code: 200,
  credits_charged: null,
  credit_price_usd_at_event: null,
  correlation_id: null,
  ...overrides,
});

const ingest = async (events: UsageEventInput[]) => {
  const captured: Array<Record<string, unknown>> = [];
  spyOn(PricingService, "getIndex").mockResolvedValue({} as never);
  spyOn(PricingService, "price").mockReturnValue({
    costUsd: 7,
    confidence: "high",
    matched: true,
  });
  spyOn(UsageEventRepository, "insertMany").mockImplementation(
    async (_db: InsertManyArgs[0], rows: InsertManyArgs[1]) => {
      captured.push(...(rows as unknown as Array<Record<string, unknown>>));
      return rows.length;
    },
  );

  await UsageEventService.ingest({} as DrizzleD1Database, "tenant-1", {
    app: "test-app",
    events,
  });
  return captured;
};

afterEach(() => {
  mock.restore();
});

describe("usage event cost provenance", () => {
  it("keeps new provenance while preserving the old SDK default", async () => {
    const rows = await ingest([
      event({ id: "vendor", cost_usd: 1, cost_source: "vendor_stated" }),
      event({ id: "table", cost_usd: 2, cost_source: "sdk_table" }),
      event({ id: "flat", cost_usd: 3, cost_source: "sdk_flat" }),
      event({ id: "legacy", cost_usd: 4 }),
    ]);

    expect(rows.map(({ id, cost_source, cost_confidence }) => ({
      id,
      cost_source,
      cost_confidence,
    }))).toEqual([
      { id: "vendor", cost_source: "vendor_stated", cost_confidence: "high" },
      { id: "table", cost_source: "sdk_table", cost_confidence: "medium" },
      { id: "flat", cost_source: "sdk_flat", cost_confidence: "low" },
      { id: "legacy", cost_source: "provider_response", cost_confidence: "high" },
    ]);
  });

  it("lets catalog and credit-rate pricing override SDK provenance", async () => {
    const rows = await ingest([
      event({
        id: "catalog",
        provider: "openai",
        model: "gpt-5",
        prompt_tokens: 10,
        completion_tokens: 5,
        cost_usd: 99,
        cost_source: "sdk_flat",
      }),
      event({
        id: "credit-rate",
        provider: "ahrefs",
        cost_usd: null,
        cost_source: "vendor_stated",
        credits_charged: 4,
        credit_price_usd_at_event: 0.25,
      }),
    ]);

    expect(rows.map(({ id, cost_usd, cost_source, cost_confidence }) => ({
      id,
      cost_usd,
      cost_source,
      cost_confidence,
    }))).toEqual([
      { id: "catalog", cost_usd: 7, cost_source: "catalog", cost_confidence: "high" },
      {
        id: "credit-rate",
        cost_usd: 1,
        cost_source: "credit_rate",
        cost_confidence: "medium",
      },
    ]);
  });
});

describe("repricing never overwrites a vendor-stated figure", () => {
  // The whole point of provenance. OpenRouter's `usage.cost` IS the amount
  // charged; a catalog computation from token counts only approximates it.
  // Repricing exists to replace the SDK's frozen table, not the receipt.
  it("leaves a vendor-stated openrouter cost alone, but reprices an SDK-computed one", async () => {
    const rows = await ingest([
      event({
        id: "receipt",
        provider: "openrouter",
        model: "deepseek/deepseek-v4-flash",
        prompt_tokens: 100,
        completion_tokens: 50,
        cost_usd: 0.0141,
        cost_source: "vendor_stated",
      }),
      event({
        id: "guess",
        provider: "openrouter",
        model: "deepseek/deepseek-v4-flash",
        prompt_tokens: 100,
        completion_tokens: 50,
        cost_usd: 0.0141,
        cost_source: "sdk_table",
      }),
    ]);

    expect(
      rows.map(({ id, cost_usd, cost_source }) => ({ id, cost_usd, cost_source })),
    ).toEqual([
      { id: "receipt", cost_usd: 0.0141, cost_source: "vendor_stated" },
      { id: "guess", cost_usd: 7, cost_source: "catalog" },
    ]);
  });

  it("is conservative for an unlabelled figure only where the vendor could have stated it", async () => {
    const rows = await ingest([
      // Old SDK, no provenance. OpenRouter can return `usage.cost`, so this
      // might be a real receipt and must not be overwritten.
      event({
        id: "openrouter-legacy",
        provider: "openrouter",
        model: "deepseek/deepseek-v4-flash",
        prompt_tokens: 100,
        completion_tokens: 50,
        cost_usd: 0.0141,
      }),
      // Old SDK, no provenance. The openai extractor has no vendor-stated
      // branch at all, so this is always the SDK's own table and is safe to
      // replace. Repricing these is the entire reason the catalog exists.
      event({
        id: "openai-legacy",
        provider: "openai",
        model: "gpt-5",
        prompt_tokens: 100,
        completion_tokens: 50,
        cost_usd: 0.0141,
      }),
      // No figure to protect, so repricing is unambiguously an improvement.
      event({
        id: "openrouter-no-cost",
        provider: "openrouter",
        model: "deepseek/deepseek-v4-flash",
        prompt_tokens: 100,
        completion_tokens: 50,
        cost_usd: null,
      }),
    ]);

    expect(
      rows.map(({ id, cost_usd, cost_source }) => ({ id, cost_usd, cost_source })),
    ).toEqual([
      {
        id: "openrouter-legacy",
        cost_usd: 0.0141,
        cost_source: "provider_response",
      },
      { id: "openai-legacy", cost_usd: 7, cost_source: "catalog" },
      { id: "openrouter-no-cost", cost_usd: 7, cost_source: "catalog" },
    ]);
  });
});
