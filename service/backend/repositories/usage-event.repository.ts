import { eq, and, gte, sql, desc } from "drizzle-orm";
import { DrizzleD1Database } from "drizzle-orm/d1";
import UsageEvent from "../models/usage-event.model";

const dayMs = 86_400_000;

interface BaseFilters {
  tenant_id: string;
  fromTs: number;
  app?: string;
  provider?: string;
  clerk_org_id?: string;
  clerk_user_id?: string;
}

const buildWhere = (filters: BaseFilters) => {
  const conditions = [
    eq(UsageEvent.tenant_id, filters.tenant_id),
    gte(UsageEvent.timestamp, filters.fromTs),
  ];
  if (filters.app) conditions.push(eq(UsageEvent.app, filters.app));
  if (filters.provider) conditions.push(eq(UsageEvent.provider, filters.provider));
  if (filters.clerk_org_id)
    conditions.push(eq(UsageEvent.clerk_org_id, filters.clerk_org_id));
  if (filters.clerk_user_id)
    conditions.push(eq(UsageEvent.clerk_user_id, filters.clerk_user_id));
  return and(...conditions);
};

class UsageEventRepository {
  static async insertMany(
    db: DrizzleD1Database,
    rows: (typeof UsageEvent.$inferInsert)[],
  ): Promise<number> {
    if (rows.length === 0) return 0;
    const stmts = rows.map((r) =>
      db
        .insert(UsageEvent)
        .values(r)
        .onConflictDoNothing({ target: UsageEvent.id }),
    );
    await db.batch(stmts as any);
    return rows.length;
  }

  static async findById(db: DrizzleD1Database, id: string) {
    const [row] = await db
      .select()
      .from(UsageEvent)
      .where(eq(UsageEvent.id, id));
    return row;
  }

  static async groupBy(
    db: DrizzleD1Database,
    column: keyof typeof UsageEvent.$inferSelect,
    filters: BaseFilters,
  ) {
    const col = (UsageEvent as any)[column];
    return db
      .select({
        key: col,
        cost_usd: sql<number>`COALESCE(SUM(${UsageEvent.cost_usd}), 0)`,
        prompt_tokens: sql<number>`COALESCE(SUM(${UsageEvent.prompt_tokens}), 0)`,
        completion_tokens: sql<number>`COALESCE(SUM(${UsageEvent.completion_tokens}), 0)`,
        requests: sql<number>`COUNT(*)`,
      })
      .from(UsageEvent)
      .where(buildWhere(filters))
      .groupBy(col)
      .orderBy(desc(sql`SUM(${UsageEvent.cost_usd})`));
  }

  static async totals(db: DrizzleD1Database, filters: BaseFilters) {
    const [row] = await db
      .select({
        cost_usd: sql<number>`COALESCE(SUM(${UsageEvent.cost_usd}), 0)`,
        prompt_tokens: sql<number>`COALESCE(SUM(${UsageEvent.prompt_tokens}), 0)`,
        completion_tokens: sql<number>`COALESCE(SUM(${UsageEvent.completion_tokens}), 0)`,
        requests: sql<number>`COUNT(*)`,
      })
      .from(UsageEvent)
      .where(buildWhere(filters));
    return (
      row ?? { cost_usd: 0, prompt_tokens: 0, completion_tokens: 0, requests: 0 }
    );
  }

  static fromDaysToTs(fromDays: number): number {
    return Date.now() - fromDays * dayMs;
  }

  static async previousTotals(
    db: DrizzleD1Database,
    filters: BaseFilters,
    fromDays: number,
  ) {
    const fromTs = filters.fromTs - fromDays * dayMs;
    const toTs = filters.fromTs;
    const conditions = [
      eq(UsageEvent.tenant_id, filters.tenant_id),
      gte(UsageEvent.timestamp, fromTs),
      sql`${UsageEvent.timestamp} < ${toTs}`,
    ];
    if (filters.app) conditions.push(eq(UsageEvent.app, filters.app));
    if (filters.provider) conditions.push(eq(UsageEvent.provider, filters.provider));
    if (filters.clerk_org_id) conditions.push(eq(UsageEvent.clerk_org_id, filters.clerk_org_id));
    if (filters.clerk_user_id) conditions.push(eq(UsageEvent.clerk_user_id, filters.clerk_user_id));
    const [row] = await db
      .select({
        cost_usd: sql<number>`COALESCE(SUM(${UsageEvent.cost_usd}), 0)`,
        requests: sql<number>`COUNT(*)`,
      })
      .from(UsageEvent)
      .where(and(...conditions));
    return row ?? { cost_usd: 0, requests: 0 };
  }
}

export { UsageEventRepository };
