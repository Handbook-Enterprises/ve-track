import { sqliteTable, text, real, integer, primaryKey } from "drizzle-orm/sqlite-core";

const ModelPricing = sqliteTable(
  "model_pricing",
  {
    provider: text().notNull(),
    model_id: text().notNull(),
    input_per_m: real().notNull().default(0),
    output_per_m: real().notNull().default(0),
    cache_read_per_m: real(),
    cache_write_per_m: real(),
    updated_at: integer().notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.provider, t.model_id] }),
  }),
);

export default ModelPricing;
