import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { timestamps } from "../utils";

const ApiKey = sqliteTable(
  "api_keys",
  {
    id: text()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    tenant_id: text().notNull(),
    name: text().notNull(),
    prefix: text().notNull(),
    hashed_key: text().notNull(),
    revoked_at: integer(),
    ...timestamps,
  },
  (t) => ({
    hashedKeyIdx: index("idx_api_keys_hashed_key").on(t.hashed_key),
    tenantIdx: index("idx_api_keys_tenant").on(t.tenant_id),
  }),
);

export default ApiKey;
