import { sqliteTable, text, real, integer, index } from "drizzle-orm/sqlite-core";
import { timestamps } from "../utils";

const TrackerCost = sqliteTable(
  "tracker_costs",
  {
    id: text().primaryKey(),
    tracker_id: text().notNull(),
    tenant_id: text().notNull(),
    day: text().notNull(),
    ts: integer().notNull(),
    cost_usd: real().notNull().default(0),
    requests: integer(),
    ...timestamps,
  },
  (t) => ({
    trackerTsIdx: index("idx_tracker_costs_tracker_ts").on(t.tracker_id, t.ts),
    tenantIdx: index("idx_tracker_costs_tenant").on(t.tenant_id),
  }),
);

export default TrackerCost;
