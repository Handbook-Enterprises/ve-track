import { eq, and, gte, sql, desc } from "drizzle-orm";
import { DrizzleD1Database } from "drizzle-orm/d1";
import Credit from "../models/credit.model";

const dayMs = 86_400_000;

interface CreditFilters {
  tenant_id: string;
  fromTs: number;
  toTs?: number;
  app?: string;
  clerk_org_id?: string;
  clerk_user_id?: string;
  action?: string;
  correlation_id?: string;
}

const revenueSql = sql<number>`COALESCE(SUM(${Credit.credits} * COALESCE(${Credit.credit_price_usd}, 0)), 0)`;
const creditsSql = sql<number>`COALESCE(SUM(${Credit.credits}), 0)`;
const costSql = sql<number>`COALESCE(SUM(${Credit.cost_usd}), 0)`;

const buildWhere = (filters: CreditFilters) => {
  const conditions = [
    eq(Credit.tenant_id, filters.tenant_id),
    gte(Credit.timestamp, filters.fromTs),
  ];
  if (filters.toTs != null)
    conditions.push(sql`${Credit.timestamp} < ${filters.toTs}`);
  if (filters.app) conditions.push(eq(Credit.app, filters.app));
  if (filters.clerk_org_id)
    conditions.push(eq(Credit.clerk_org_id, filters.clerk_org_id));
  if (filters.clerk_user_id)
    conditions.push(eq(Credit.clerk_user_id, filters.clerk_user_id));
  if (filters.action) conditions.push(eq(Credit.action, filters.action));
  if (filters.correlation_id)
    conditions.push(eq(Credit.correlation_id, filters.correlation_id));
  return and(...conditions);
};

class CreditRepository {
  static async insertMany(
    db: DrizzleD1Database,
    rows: (typeof Credit.$inferInsert)[],
  ): Promise<number> {
    if (rows.length === 0) return 0;
    const stmts = rows.map((r) =>
      db.insert(Credit).values(r).onConflictDoNothing({ target: Credit.id }),
    );
    await db.batch(stmts as any);
    return rows.length;
  }

  static async groupBy(
    db: DrizzleD1Database,
    column: keyof typeof Credit.$inferSelect,
    filters: CreditFilters,
  ) {
    const col = (Credit as any)[column];
    return db
      .select({
        key: col,
        credits: creditsSql,
        revenue_usd: revenueSql,
        cost_usd: costSql,
        charges: sql<number>`COUNT(*)`,
      })
      .from(Credit)
      .where(buildWhere(filters))
      .groupBy(col)
      .orderBy(desc(revenueSql));
  }

  static async totals(db: DrizzleD1Database, filters: CreditFilters) {
    const [row] = await db
      .select({
        credits: creditsSql,
        revenue_usd: revenueSql,
        cost_usd: costSql,
        charges: sql<number>`COUNT(*)`,
      })
      .from(Credit)
      .where(buildWhere(filters));
    return row ?? { credits: 0, revenue_usd: 0, cost_usd: 0, charges: 0 };
  }

  static async previousTotals(
    db: DrizzleD1Database,
    filters: CreditFilters,
    fromDays: number,
  ) {
    const fromTs = filters.fromTs - fromDays * dayMs;
    const toTs = filters.fromTs;
    const conditions = [
      eq(Credit.tenant_id, filters.tenant_id),
      gte(Credit.timestamp, fromTs),
      sql`${Credit.timestamp} < ${toTs}`,
    ];
    if (filters.app) conditions.push(eq(Credit.app, filters.app));
    if (filters.clerk_org_id)
      conditions.push(eq(Credit.clerk_org_id, filters.clerk_org_id));
    if (filters.clerk_user_id)
      conditions.push(eq(Credit.clerk_user_id, filters.clerk_user_id));
    if (filters.action) conditions.push(eq(Credit.action, filters.action));
    const [row] = await db
      .select({
        credits: creditsSql,
        revenue_usd: revenueSql,
        cost_usd: costSql,
        charges: sql<number>`COUNT(*)`,
      })
      .from(Credit)
      .where(and(...conditions));
    return row ?? { credits: 0, revenue_usd: 0, cost_usd: 0, charges: 0 };
  }

  static async dailySeries(db: DrizzleD1Database, filters: CreditFilters) {
    const day = sql<string>`strftime('%Y-%m-%d', ${Credit.timestamp} / 1000, 'unixepoch')`;
    return db
      .select({
        day,
        credits: creditsSql,
        revenue_usd: revenueSql,
        cost_usd: costSql,
        charges: sql<number>`COUNT(*)`,
      })
      .from(Credit)
      .where(buildWhere(filters))
      .groupBy(day)
      .orderBy(day);
  }

  static fromDaysToTs(fromDays: number): number {
    return Date.now() - fromDays * dayMs;
  }
}

export { CreditRepository };
export type { CreditFilters };
