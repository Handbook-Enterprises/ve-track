import { sqliteTable, text, index } from "drizzle-orm/sqlite-core";
import { timestamps } from "../utils";

const Tenant = sqliteTable(
  "tenants",
  {
    id: text()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text().notNull(),
    clerk_org_id: text(),
    clerk_user_id: text(),
    plan: text().notNull().default("free"),
    ...timestamps,
  },
  (t) => ({
    clerkOrgIdx: index("idx_tenants_clerk_org_id").on(t.clerk_org_id),
    clerkUserIdx: index("idx_tenants_clerk_user_id").on(t.clerk_user_id),
  }),
);

export default Tenant;
