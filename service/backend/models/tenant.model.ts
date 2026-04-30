import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import { timestamps } from "../utils";

const Tenant = sqliteTable("tenants", {
  id: text()
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text().notNull(),
  clerk_org_id: text(),
  plan: text().notNull().default("free"),
  ...timestamps,
});

export default Tenant;
