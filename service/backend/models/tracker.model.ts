import { sqliteTable, text, integer, real, index, uniqueIndex } from "drizzle-orm/sqlite-core";
import { timestamps } from "../utils";

const CostTracker = sqliteTable(
  "cost_trackers",
  {
    id: text()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    tenant_id: text().notNull(),
    provider: text().notNull(),
    label: text().notNull(),
    app: text().notNull(),
    key_ciphertext: text().notNull(),
    key_iv: text().notNull(),
    wrapped_dek: text().notNull(),
    dek_iv: text().notNull(),
    key_last4: text().notNull(),
    dedup_hash: text().notNull(),
    status: text().notNull().default("active"),
    last_error: text(),
    last_synced_at: integer(),
    pulled_cost_usd: real().notNull().default(0),
    ...timestamps,
  },
  (t) => ({
    tenantIdx: index("idx_cost_trackers_tenant").on(t.tenant_id),
    tenantDedupIdx: uniqueIndex("idx_cost_trackers_tenant_dedup").on(
      t.tenant_id,
      t.dedup_hash,
    ),
  }),
);

export default CostTracker;
