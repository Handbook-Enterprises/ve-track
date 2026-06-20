import { sqliteTable, text, index } from "drizzle-orm/sqlite-core";
import { timestamps } from "../utils";

const Organization = sqliteTable(
  "organizations",
  {
    id: text()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    tenant_id: text().notNull(),
    external_id: text(),
    name: text(),
    domain: text(),
    status: text().notNull().default("active"),
    ...timestamps,
  },
  (t) => ({
    tenantIdx: index("idx_organizations_tenant").on(t.tenant_id),
    tenantExternalIdx: index("idx_organizations_tenant_external").on(
      t.tenant_id,
      t.external_id,
    ),
  }),
);

export default Organization;
