import { eq, and, gte, lte, asc } from "drizzle-orm";
import { DrizzleD1Database } from "drizzle-orm/d1";
import TrackerSnapshot from "../models/tracker-snapshot.model";

class TrackerSnapshotRepository {
  static async upsert(
    db: DrizzleD1Database,
    row: typeof TrackerSnapshot.$inferInsert,
  ): Promise<void> {
    await db
      .insert(TrackerSnapshot)
      .values(row)
      .onConflictDoUpdate({
        target: TrackerSnapshot.id,
        set: {
          ts: row.ts,
          monthly_spend: row.monthly_spend,
          weekly_spend: row.weekly_spend,
          balance_usd: row.balance_usd,
          credits_remaining: row.credits_remaining,
          request_count: row.request_count,
          updated_at: new Date().toISOString(),
        },
      });
  }

  static async seriesBetween(
    db: DrizzleD1Database,
    trackerId: string,
    fromTs: number,
    toTs?: number,
  ) {
    const conditions = [
      eq(TrackerSnapshot.tracker_id, trackerId),
      gte(TrackerSnapshot.ts, fromTs),
    ];
    if (toTs != null) conditions.push(lte(TrackerSnapshot.ts, toTs));
    return db
      .select({
        day: TrackerSnapshot.day,
        monthly_spend: TrackerSnapshot.monthly_spend,
        weekly_spend: TrackerSnapshot.weekly_spend,
        balance_usd: TrackerSnapshot.balance_usd,
        credits_remaining: TrackerSnapshot.credits_remaining,
        request_count: TrackerSnapshot.request_count,
      })
      .from(TrackerSnapshot)
      .where(and(...conditions))
      .orderBy(asc(TrackerSnapshot.ts));
  }

  static async recentForTenant(
    db: DrizzleD1Database,
    tenantId: string,
    sinceTs: number,
  ) {
    return db
      .select({
        tracker_id: TrackerSnapshot.tracker_id,
        day: TrackerSnapshot.day,
        ts: TrackerSnapshot.ts,
        monthly_spend: TrackerSnapshot.monthly_spend,
        weekly_spend: TrackerSnapshot.weekly_spend,
        balance_usd: TrackerSnapshot.balance_usd,
        credits_remaining: TrackerSnapshot.credits_remaining,
        request_count: TrackerSnapshot.request_count,
      })
      .from(TrackerSnapshot)
      .where(
        and(
          eq(TrackerSnapshot.tenant_id, tenantId),
          gte(TrackerSnapshot.ts, sinceTs),
        ),
      )
      .orderBy(asc(TrackerSnapshot.tracker_id), asc(TrackerSnapshot.ts));
  }

  static async deleteForTracker(db: DrizzleD1Database, trackerId: string) {
    await db
      .delete(TrackerSnapshot)
      .where(eq(TrackerSnapshot.tracker_id, trackerId));
  }
}

export { TrackerSnapshotRepository };
