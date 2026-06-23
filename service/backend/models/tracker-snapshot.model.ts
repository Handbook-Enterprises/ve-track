import { sqliteTable, text, real, integer, index } from "drizzle-orm/sqlite-core";
import { timestamps } from "../utils";

const TrackerSnapshot = sqliteTable(
  "tracker_snapshots",
  {
    id: text().primaryKey(),
    tracker_id: text().notNull(),
    tenant_id: text().notNull(),
    day: text().notNull(),
    ts: integer().notNull(),
    monthly_spend: real(),
    weekly_spend: real(),
    balance_usd: real(),
    total_usage_usd: real(),
    credits_remaining: real(),
    request_count: integer(),
    daily_spend: real(),
    ...timestamps,
  },
  (t) => ({
    trackerTsIdx: index("idx_tracker_snapshots_tracker_ts").on(
      t.tracker_id,
      t.ts,
    ),
    tenantIdx: index("idx_tracker_snapshots_tenant").on(t.tenant_id),
  }),
);

export default TrackerSnapshot;
