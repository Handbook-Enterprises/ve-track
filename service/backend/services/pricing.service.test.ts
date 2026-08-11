// @ts-expect-error Bun provides this runtime module; the service does not install Bun type declarations.
import { expect, spyOn, test } from "bun:test";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import PricingService, { REPRICE_PROVIDERS } from "./pricing.service";

type SyncedRow = {
  provider: string;
  model_id: string;
  input_per_m: number;
  output_per_m: number;
};

// Captures the rows syncCatalog would write, without a database. models.dev is
// stubbed with the exact shapes the live catalogue uses.
const runSyncCatalog = async (catalog: unknown): Promise<SyncedRow[]> => {
  const written: SyncedRow[] = [];
  const db = {
    insert: () => ({
      values: (rows: SyncedRow[]) => ({
        onConflictDoUpdate: async () => {
          written.push(...rows);
        },
      }),
    }),
    select: () => ({ from: async () => [{ latest: 0 }] }),
  } as unknown as DrizzleD1Database;

  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(JSON.stringify(catalog), {
      status: 200,
      headers: { "content-type": "application/json" },
    })) as typeof fetch;
  const logSpy = spyOn(console, "log").mockImplementation(() => undefined);
  try {
    await PricingService.syncCatalog(db);
  } finally {
    globalThis.fetch = originalFetch;
    logSpy.mockRestore();
  }
  return written;
};

test("openrouter is both synced from the catalogue and repriced server side", () => {
  // Turning on repricing without also syncing the catalogue would make
  // resolveEntry miss every openrouter model and stamp ~196k events
  // "estimate", which is worse than leaving it off.
  expect(REPRICE_PROVIDERS.has("openrouter")).toBe(true);
});

test("syncCatalog pulls openrouter models under their author/slug ids", async () => {
  const rows = await runSyncCatalog({
    openrouter: {
      models: {
        "deepseek/deepseek-v4-flash-0731": { cost: { input: 0.08, output: 0.18 } },
        "anthropic/claude-haiku-4.5": { cost: { input: 1, output: 5 } },
      },
    },
  });

  expect(rows).toEqual([
    expect.objectContaining({
      provider: "openrouter",
      model_id: "deepseek/deepseek-v4-flash-0731",
      input_per_m: 0.08,
    }),
    expect.objectContaining({
      provider: "openrouter",
      model_id: "anthropic/claude-haiku-4.5",
      input_per_m: 1,
    }),
  ]);
});

test("a model with no token pricing is skipped, not written as free", async () => {
  // models.dev ships `cost: {}` for image and video models and for
  // OpenRouter's routing pseudo-models. Writing those as 0 would report them
  // as free at "high" confidence and overwrite a vendor-stated dollar figure.
  const rows = await runSyncCatalog({
    openrouter: {
      models: {
        "openrouter/auto": { cost: {} },
        "openrouter/fusion": {},
        "nvidia/nemotron-nano-9b-v2:free": { cost: { input: 0, output: 0 } },
        "deepseek/deepseek-v4-flash": { cost: { input: 0.14, output: 0.28 } },
      },
    },
  });

  expect(rows.map((r) => r.model_id)).toEqual([
    // An explicit 0 is a real claim that the model is free, and is kept.
    "nvidia/nemotron-nano-9b-v2:free",
    "deepseek/deepseek-v4-flash",
  ]);
});

test("prices a real openrouter model id by exact match", async () => {
  const index = await PricingService.getIndex({
    select: () => ({
      from: async () => [
        {
          provider: "openrouter",
          model_id: "deepseek/deepseek-v4-flash-0731",
          input_per_m: 0.08,
          output_per_m: 0.18,
          cache_read_per_m: null,
          cache_write_per_m: null,
        },
        {
          // A "latest" alias. It must never be reached by the startsWith
          // fallback for a concrete model id.
          provider: "openrouter",
          model_id: "~deepseek/deepseek-v4-flash-latest",
          input_per_m: 999,
          output_per_m: 999,
          cache_read_per_m: null,
          cache_write_per_m: null,
        },
      ],
    }),
  } as unknown as DrizzleD1Database);

  const priced = PricingService.price(
    index,
    "openrouter",
    "deepseek/deepseek-v4-flash-0731",
    { prompt: 1_000_000, cached: 0, cacheWrite: 0, completion: 1_000_000 },
  );

  expect(priced.matched).toBe(true);
  expect(priced.confidence).toBe("high");
  expect(priced.costUsd).toBe(0.26);
});


test("syncIfStale logs and rethrows repository failures", async () => {
  const failure = new Error("D1 read failed");
  const db = {
    select: () => ({
      from: () => Promise.reject(failure),
    }),
  } as unknown as DrizzleD1Database;
  const errorSpy = spyOn(console, "error").mockImplementation(() => undefined);

  try {
    await expect(PricingService.syncIfStale(db)).rejects.toBe(failure);
    expect(errorSpy).toHaveBeenCalledWith(
      "[ve-track][pricing] syncIfStale failed",
      failure,
    );
  } finally {
    errorSpy.mockRestore();
  }
});
