import { sqliteTable, text, real, index, uniqueIndex } from "drizzle-orm/sqlite-core";
import { timestamps } from "../utils";

const Action = sqliteTable(
  "actions",
  {
    id: text()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    tenant_id: text().notNull(),
    slug: text().notNull(),
    name: text().notNull(),
    app_slug: text(),
    description: text(),
    credits_per_call: real(),
    status: text().notNull().default("active"),
    ...timestamps,
  },
  (t) => ({
    tenantIdx: index("idx_actions_tenant").on(t.tenant_id),
    tenantAppIdx: index("idx_actions_tenant_app").on(t.tenant_id, t.app_slug),
    tenantAppSlugIdx: uniqueIndex("idx_actions_tenant_app_slug").on(
      t.tenant_id,
      t.app_slug,
      t.slug,
    ),
  }),
);

export default Action;
