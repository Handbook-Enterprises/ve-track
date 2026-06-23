import { eq, and, desc } from "drizzle-orm";
import { DrizzleD1Database } from "drizzle-orm/d1";
import Tracker from "../models/tracker.model";

type TrackerRow = typeof Tracker.$inferSelect;

const PUBLIC_COLUMNS = {
  id: Tracker.id,
  tenant_id: Tracker.tenant_id,
  provider: Tracker.provider,
  key_last4: Tracker.key_last4,
  account_ref: Tracker.account_ref,
  status: Tracker.status,
  last_error: Tracker.last_error,
  last_synced_at: Tracker.last_synced_at,
  pulled_cost_usd: Tracker.pulled_cost_usd,
  monthly_spend: Tracker.monthly_spend,
  weekly_spend: Tracker.weekly_spend,
  balance_usd: Tracker.balance_usd,
  total_usage_usd: Tracker.total_usage_usd,
  total_usage_credits: Tracker.total_usage_credits,
  credits_remaining: Tracker.credits_remaining,
  request_count: Tracker.request_count,
  created_at: Tracker.created_at,
  updated_at: Tracker.updated_at,
};

class TrackerRepository {
  static async create(
    db: DrizzleD1Database,
    payload: typeof Tracker.$inferInsert,
  ) {
    const [created] = await db.insert(Tracker).values(payload).returning();
    return created;
  }

  static async fetchByTenant(db: DrizzleD1Database, tenant_id: string) {
    return db
      .select(PUBLIC_COLUMNS)
      .from(Tracker)
      .where(eq(Tracker.tenant_id, tenant_id))
      .orderBy(desc(Tracker.created_at));
  }

  static async fetchById(db: DrizzleD1Database, id: string) {
    const [row] = await db.select().from(Tracker).where(eq(Tracker.id, id));
    return row as TrackerRow | undefined;
  }

  static async fetchByDedup(
    db: DrizzleD1Database,
    tenant_id: string,
    dedup_hash: string,
  ) {
    const [row] = await db
      .select(PUBLIC_COLUMNS)
      .from(Tracker)
      .where(
        and(
          eq(Tracker.tenant_id, tenant_id),
          eq(Tracker.dedup_hash, dedup_hash),
        ),
      );
    return row;
  }

  static async fetchActive(db: DrizzleD1Database) {
    return db.select().from(Tracker).where(eq(Tracker.status, "active"));
  }

  static async update(
    db: DrizzleD1Database,
    id: string,
    update: Partial<typeof Tracker.$inferInsert>,
  ) {
    const [updated] = await db
      .update(Tracker)
      .set({ ...update, updated_at: new Date().toISOString() })
      .where(eq(Tracker.id, id))
      .returning();
    return updated;
  }

  static async remove(db: DrizzleD1Database, id: string) {
    const [deleted] = await db
      .delete(Tracker)
      .where(eq(Tracker.id, id))
      .returning(PUBLIC_COLUMNS);
    return deleted;
  }
}

export { TrackerRepository };
