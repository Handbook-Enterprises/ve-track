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
    action: text(),
    provider: text().notNull(),
    model: text(),
    prompt_tokens: integer(),
    completion_tokens: integer(),
    cached_input_tokens: integer(),
    cache_write_tokens: integer(),
    reasoning_tokens: integer(),
    latency_ms: integer(),
    cost_usd: real(),
    cost_source: text(),
    cost_confidence: text(),
    status_code: integer(),
    credits_charged: real(),
    credit_price_usd_at_event: real(),
    correlation_id: text(),
  },
  (t) => ({
    tenantTime: index("idx_usage_tenant_time").on(t.tenant_id, t.timestamp),
    tenantApp: index("idx_usage_tenant_app").on(t.tenant_id, t.app, t.timestamp),
    tenantOrg: index("idx_usage_tenant_org").on(t.tenant_id, t.clerk_org_id, t.timestamp),
    tenantUser: index("idx_usage_tenant_user").on(t.tenant_id, t.clerk_user_id, t.timestamp),
    tenantProvider: index("idx_usage_tenant_provider").on(t.tenant_id, t.provider, t.timestamp),
    tenantAction: index("idx_usage_tenant_action").on(t.tenant_id, t.action, t.timestamp),
    tenantCorrelation: index("idx_usage_tenant_correlation").on(t.tenant_id, t.correlation_id, t.timestamp),
    tenantAppAction: index("idx_usage_tenant_app_action").on(t.tenant_id, t.app, t.action, t.timestamp),
  }),
);

export default UsageEvent;
