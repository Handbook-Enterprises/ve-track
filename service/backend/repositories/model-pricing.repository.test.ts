// @ts-expect-error Bun provides this runtime module; the service does not install Bun type declarations.
import { describe, expect, test } from "bun:test";
import { sql } from "drizzle-orm";
import { drizzle, type DrizzleD1Database } from "drizzle-orm/d1";
import ModelPricing from "../models/model-pricing.model";
import {
  ModelPricingRepository,
  UPSERT_CHUNK_SIZE,
} from "./model-pricing.repository";

type PricingRow = typeof ModelPricing.$inferInsert;

const makeRows = (count: number): PricingRow[] =>
  Array.from({ length: count }, (_, index) => ({
    provider: "provider",
    model_id: `model-${index}`,
    input_per_m: index + 0.1,
    output_per_m: index + 0.2,
    cache_read_per_m: index + 0.3,
    cache_write_per_m: index + 0.4,
    updated_at: 1_700_000_000_000 + index,
  }));

const buildUpsert = (rows: PricingRow[]) =>
  drizzle({} as D1Database)
    .insert(ModelPricing)
    .values(rows)
    .onConflictDoUpdate({
      target: [ModelPricing.provider, ModelPricing.model_id],
      set: {
        input_per_m: sql`excluded.input_per_m`,
        output_per_m: sql`excluded.output_per_m`,
        cache_read_per_m: sql`excluded.cache_read_per_m`,
        cache_write_per_m: sql`excluded.cache_write_per_m`,
        updated_at: sql`excluded.updated_at`,
      },
    });

const fakeDb = (
  execute: (rows: PricingRow[]) => Promise<void>,
): DrizzleD1Database =>
  ({
    insert: () => ({
      values: (rows: PricingRow[]) => ({
        onConflictDoUpdate: () => execute(rows),
      }),
    }),
  }) as unknown as DrizzleD1Database;

describe("ModelPricingRepository.upsertMany", () => {
  test("keeps each generated D1 statement within 100 bound parameters", () => {
    const statement = buildUpsert(makeRows(UPSERT_CHUNK_SIZE)).toSQL();

    expect(statement.params.length).toBeLessThanOrEqual(100);
  });

  test("chunks 102 rows at the safe boundary", async () => {
    const chunkSizes: number[] = [];
    const db = fakeDb(async (rows) => {
      chunkSizes.push(rows.length);
    });

    await expect(ModelPricingRepository.upsertMany(db, makeRows(102))).resolves.toBe(102);
    expect(chunkSizes).toEqual([14, 14, 14, 14, 14, 14, 14, 4]);
  });

  test("documents that a 15-row statement exceeds D1's limit", () => {
    const statement = buildUpsert(makeRows(15)).toSQL();

    expect(statement.params.length).toBeGreaterThan(100);
  });

  test("propagates an underlying statement rejection", async () => {
    const failure = new Error("D1 insert failed");
    const db = fakeDb(async () => {
      throw failure;
    });

    await expect(ModelPricingRepository.upsertMany(db, makeRows(1))).rejects.toBe(failure);
  });
});
