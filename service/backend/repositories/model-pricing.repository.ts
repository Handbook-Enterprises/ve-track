import { sql } from "drizzle-orm";
import { DrizzleD1Database } from "drizzle-orm/d1";
import ModelPricing from "../models/model-pricing.model";

type PricingRow = typeof ModelPricing.$inferInsert;

class ModelPricingRepository {
  static async upsertMany(
    db: DrizzleD1Database,
    rows: PricingRow[],
  ): Promise<number> {
    if (rows.length === 0) return 0;
    const chunks: PricingRow[][] = [];
    for (let i = 0; i < rows.length; i += 100) chunks.push(rows.slice(i, i + 100));
    for (const chunk of chunks) {
      await db
        .insert(ModelPricing)
        .values(chunk)
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
    }
    return rows.length;
  }

  static async getAll(db: DrizzleD1Database) {
    return db.select().from(ModelPricing);
  }

  static async latestUpdatedAt(db: DrizzleD1Database): Promise<number> {
    const [row] = await db
      .select({ latest: sql<number>`COALESCE(MAX(${ModelPricing.updated_at}), 0)` })
      .from(ModelPricing);
    return Number(row?.latest ?? 0);
  }
}

export { ModelPricingRepository };
