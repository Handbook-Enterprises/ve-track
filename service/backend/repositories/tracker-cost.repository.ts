import { eq, and, gte, lte, asc, sql } from "drizzle-orm";
import { DrizzleD1Database } from "drizzle-orm/d1";
import TrackerCost from "../models/tracker-cost.model";

class TrackerCostRepository {
  static async upsertMany(
    db: DrizzleD1Database,
    rows: (typeof TrackerCost.$inferInsert)[],
  ): Promise<number> {
    if (rows.length === 0) return 0;
    const stmts = rows.map((r) =>
      db
        .insert(TrackerCost)
        .values(r)
        .onConflictDoUpdate({
          target: TrackerCost.id,
          set: {
            ts: r.ts,
            cost_usd: r.cost_usd,
            requests: r.requests,
            updated_at: new Date().toISOString(),
          },
        }),
    );
    await db.batch(stmts as any);
    return rows.length;
  }

  static async incrementDay(
    db: DrizzleD1Database,
    row: {
      id: string;
      tracker_id: string;
      tenant_id: string;
      day: string;
      ts: number;
      cost_usd: number;
    },
  ): Promise<void> {
    await db
      .insert(TrackerCost)
      .values(row)
      .onConflictDoUpdate({
        target: TrackerCost.id,
        set: {
          cost_usd: sql`${TrackerCost.cost_usd} + ${row.cost_usd}`,
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
      eq(TrackerCost.tracker_id, trackerId),
      gte(TrackerCost.ts, fromTs),
    ];
    if (toTs != null) conditions.push(lte(TrackerCost.ts, toTs));
    return db
      .select({
        day: TrackerCost.day,
        cost_usd: TrackerCost.cost_usd,
        requests: TrackerCost.requests,
      })
      .from(TrackerCost)
      .where(and(...conditions))
      .orderBy(asc(TrackerCost.ts));
  }

  static async totalsBetween(
    db: DrizzleD1Database,
    trackerId: string,
    fromTs: number,
    toTs?: number,
  ) {
    const conditions = [
      eq(TrackerCost.tracker_id, trackerId),
      gte(TrackerCost.ts, fromTs),
    ];
    if (toTs != null) conditions.push(lte(TrackerCost.ts, toTs));
    const [row] = await db
      .select({
        cost_usd: sql<number>`COALESCE(SUM(${TrackerCost.cost_usd}), 0)`,
        requests: sql<number>`COALESCE(SUM(${TrackerCost.requests}), 0)`,
      })
      .from(TrackerCost)
      .where(and(...conditions));
    return row ?? { cost_usd: 0, requests: 0 };
  }

  static async sumForTracker(
    db: DrizzleD1Database,
    trackerId: string,
  ): Promise<number> {
    const [row] = await db
      .select({
        cost_usd: sql<number>`COALESCE(SUM(${TrackerCost.cost_usd}), 0)`,
      })
      .from(TrackerCost)
      .where(eq(TrackerCost.tracker_id, trackerId));
    return Number(row?.cost_usd ?? 0);
  }

  static async deleteForTracker(db: DrizzleD1Database, trackerId: string) {
    await db.delete(TrackerCost).where(eq(TrackerCost.tracker_id, trackerId));
  }
}

export { TrackerCostRepository };
