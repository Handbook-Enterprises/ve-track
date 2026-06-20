import { sqliteTable, text, index } from "drizzle-orm/sqlite-core";
import { timestamps } from "../utils";

const Person = sqliteTable(
  "people",
  {
    id: text()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    tenant_id: text().notNull(),
    external_id: text(),
    name: text(),
    email: text(),
    avatar_url: text(),
    organization_external_id: text(),
    status: text().notNull().default("active"),
    ...timestamps,
  },
  (t) => ({
    tenantIdx: index("idx_people_tenant").on(t.tenant_id),
    tenantExternalIdx: index("idx_people_tenant_external").on(
      t.tenant_id,
      t.external_id,
    ),
  }),
);

export default Person;
