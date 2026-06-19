import { eq, and, desc } from "drizzle-orm";
import { DrizzleD1Database } from "drizzle-orm/d1";
import CostTracker from "../models/cost-tracker.model";

type TrackerRow = typeof CostTracker.$inferSelect;

const PUBLIC_COLUMNS = {
  id: CostTracker.id,
  tenant_id: CostTracker.tenant_id,
  provider: CostTracker.provider,
  label: CostTracker.label,
  app: CostTracker.app,
  key_last4: CostTracker.key_last4,
  status: CostTracker.status,
  last_error: CostTracker.last_error,
  last_synced_at: CostTracker.last_synced_at,
  pulled_cost_usd: CostTracker.pulled_cost_usd,
  created_at: CostTracker.created_at,
  updated_at: CostTracker.updated_at,
};

class CostTrackerRepository {
  static async create(
    db: DrizzleD1Database,
    payload: typeof CostTracker.$inferInsert,
  ) {
    const [created] = await db.insert(CostTracker).values(payload).returning();
    return created;
  }

  static async fetchByTenant(db: DrizzleD1Database, tenant_id: string) {
    return db
      .select(PUBLIC_COLUMNS)
      .from(CostTracker)
      .where(eq(CostTracker.tenant_id, tenant_id))
      .orderBy(desc(CostTracker.created_at));
  }

  static async fetchById(db: DrizzleD1Database, id: string) {
    const [row] = await db
      .select()
      .from(CostTracker)
      .where(eq(CostTracker.id, id));
    return row as TrackerRow | undefined;
  }

  static async fetchByDedup(
    db: DrizzleD1Database,
    tenant_id: string,
    dedup_hash: string,
  ) {
    const [row] = await db
      .select(PUBLIC_COLUMNS)
      .from(CostTracker)
      .where(
        and(
          eq(CostTracker.tenant_id, tenant_id),
          eq(CostTracker.dedup_hash, dedup_hash),
        ),
      );
    return row;
  }

  static async fetchActive(db: DrizzleD1Database) {
    return db
      .select()
      .from(CostTracker)
      .where(eq(CostTracker.status, "active"));
  }

  static async update(
    db: DrizzleD1Database,
    id: string,
    update: Partial<typeof CostTracker.$inferInsert>,
  ) {
    const [updated] = await db
      .update(CostTracker)
      .set({ ...update, updated_at: new Date().toISOString() })
      .where(eq(CostTracker.id, id))
      .returning();
    return updated;
  }

  static async remove(db: DrizzleD1Database, id: string) {
    const [deleted] = await db
      .delete(CostTracker)
      .where(eq(CostTracker.id, id))
      .returning(PUBLIC_COLUMNS);
    return deleted;
  }
}

export { CostTrackerRepository };
