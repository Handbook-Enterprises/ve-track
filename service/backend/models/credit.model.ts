import { sqliteTable, text, integer, real, index } from "drizzle-orm/sqlite-core";

const Credit = sqliteTable(
  "credits",
  {
    id: text().primaryKey(),
    tenant_id: text().notNull(),
    timestamp: integer().notNull(),
    app: text().notNull(),
    action: text(),
    clerk_org_id: text(),
    clerk_user_id: text(),
    credits: real().notNull(),
    credit_price_usd: real(),
    cost_usd: real(),
    correlation_id: text(),
    source: text().notNull().default("sdk"),
    created_at: integer().notNull(),
  },
  (t) => ({
    tenantTime: index("idx_credits_tenant_time").on(t.tenant_id, t.timestamp),
    tenantAppAction: index("idx_credits_tenant_app_action").on(
      t.tenant_id,
      t.app,
      t.action,
      t.timestamp,
    ),
    tenantOrg: index("idx_credits_tenant_org").on(
      t.tenant_id,
      t.clerk_org_id,
      t.timestamp,
    ),
    tenantCorrelation: index("idx_credits_tenant_correlation").on(
      t.tenant_id,
      t.correlation_id,
      t.timestamp,
    ),
  }),
);

export default Credit;
