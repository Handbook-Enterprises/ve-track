import { sqliteTable, text, index, uniqueIndex } from "drizzle-orm/sqlite-core";
import { timestamps } from "../utils";

const Model = sqliteTable(
  "models",
  {
    id: text()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    tenant_id: text().notNull(),
    provider: text().notNull(),
    model_id: text().notNull(),
    name: text().notNull(),
    description: text(),
    status: text().notNull().default("active"),
    ...timestamps,
  },
  (t) => ({
    tenantIdx: index("idx_models_tenant").on(t.tenant_id),
    tenantProviderModelIdx: uniqueIndex("idx_models_tenant_provider_model").on(
      t.tenant_id,
      t.provider,
      t.model_id,
    ),
  }),
);

export default Model;
