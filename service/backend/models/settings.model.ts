import {
  sqliteTable,
  text,
  integer,
  real,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { timestamps } from "../utils";

const TenantSettings = sqliteTable(
  "tenant_settings",
  {
    id: text()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    tenant_id: text().notNull(),
    models_friendly_names: integer({ mode: "boolean" })
      .notNull()
      .default(false),
    credit_price_usd: real(),
    ...timestamps,
  },
  (t) => ({
    tenantIdx: uniqueIndex("idx_tenant_settings_tenant").on(t.tenant_id),
  }),
);

export default TenantSettings;
