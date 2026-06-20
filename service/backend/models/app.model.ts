import { sqliteTable, text, index, uniqueIndex } from "drizzle-orm/sqlite-core";
import { timestamps } from "../utils";

const App = sqliteTable(
  "apps",
  {
    id: text()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    tenant_id: text().notNull(),
    slug: text().notNull(),
    name: text().notNull(),
    description: text(),
    status: text().notNull().default("active"),
    ...timestamps,
  },
  (t) => ({
    tenantIdx: index("idx_apps_tenant").on(t.tenant_id),
    tenantSlugIdx: uniqueIndex("idx_apps_tenant_slug").on(t.tenant_id, t.slug),
  }),
);

export default App;
