import { sqliteTable, text, integer, real, index } from "drizzle-orm/sqlite-core";

const Credit = sqliteTable(
  "credits",
  {
    id: text()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    tenant_id: text().notNull(),
    app: text().notNull(),
    action: text().notNull(),
    credits_per_call: real().notNull(),
    effective_from: integer().notNull(),
    effective_to: integer(),
    source: text().notNull().default("imported"),
    created_at: integer().notNull(),
  },
  (t) => ({
    lookup: index("idx_credits_lookup").on(
      t.tenant_id,
      t.app,
      t.action,
      t.effective_from,
    ),
  }),
);

export default Credit;
