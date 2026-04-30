import { sqliteTable, text, integer, real, index } from "drizzle-orm/sqlite-core";

const UsageEvent = sqliteTable(
  "usage_events",
  {
    id: text().primaryKey(),
    tenant_id: text().notNull(),
    timestamp: integer().notNull(),
    app: text().notNull(),
    clerk_user_id: text(),
    clerk_org_id: text(),
    provider: text().notNull(),
    model: text(),
    prompt_tokens: integer(),
    completion_tokens: integer(),
    latency_ms: integer(),
    cost_usd: real(),
    status_code: integer(),
  },
  (t) => ({
    tenantTime: index("idx_usage_tenant_time").on(t.tenant_id, t.timestamp),
    tenantApp: index("idx_usage_tenant_app").on(t.tenant_id, t.app, t.timestamp),
    tenantOrg: index("idx_usage_tenant_org").on(t.tenant_id, t.clerk_org_id, t.timestamp),
    tenantUser: index("idx_usage_tenant_user").on(t.tenant_id, t.clerk_user_id, t.timestamp),
    tenantProvider: index("idx_usage_tenant_provider").on(t.tenant_id, t.provider, t.timestamp),
  }),
);

export default UsageEvent;
