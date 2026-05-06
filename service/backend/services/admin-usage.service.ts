import { DrizzleD1Database } from "drizzle-orm/d1";
import { UsageEventRepository } from "../repositories/usage-event.repository";

const DEFAULT_FROM_DAYS = 30;
const dayMs = 86_400_000;

const parseFromDays = (raw?: string): number => {
  const parsed = parseInt(raw ?? `${DEFAULT_FROM_DAYS}`, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_FROM_DAYS;
  return Math.min(parsed, 365);
};

const computeDelta = (current: number, previous: number) => {
  if (previous <= 0 && current <= 0) {
    return { previousCost: previous, pctChange: null, direction: "flat" as const };
  }
  if (previous <= 0) {
    return { previousCost: previous, pctChange: null, direction: "up" as const };
  }
  const pctChange = ((current - previous) / previous) * 100;
  const direction = pctChange > 0.5 ? "up" : pctChange < -0.5 ? "down" : "flat";
  return { previousCost: previous, pctChange, direction };
};

class AdminUsageService {
  static async getTotals(db: DrizzleD1Database, fromDaysRaw?: string) {
    const fromDays = parseFromDays(fromDaysRaw);
    const fromTs = Date.now() - fromDays * dayMs;
    const prevTs = Date.now() - 2 * fromDays * dayMs;
    const [current, prev] = await Promise.all([
      UsageEventRepository.crossTenantTotals(db, fromTs),
      UsageEventRepository.crossTenantTotalsBetween(db, prevTs, fromTs),
    ]);
    const delta = computeDelta(
      Number(current.cost_usd ?? 0),
      Number(prev.cost_usd ?? 0),
    );
    return {
      success: true,
      fromDays,
      totals: { ...current, fromDays, delta },
    };
  }

  static async getByApp(db: DrizzleD1Database, fromDaysRaw?: string) {
    const fromDays = parseFromDays(fromDaysRaw);
    const fromTs = Date.now() - fromDays * dayMs;
    const prevTs = Date.now() - 2 * fromDays * dayMs;
    const [groupsRaw, prevGroupsRaw] = await Promise.all([
      UsageEventRepository.crossTenantGroupBy(db, "app", fromTs),
      UsageEventRepository.crossTenantGroupByBetween(db, "app", prevTs, fromTs),
    ]);
    const prevByKey = new Map<string, number>();
    for (const row of prevGroupsRaw) {
      if (row.key) prevByKey.set(row.key, Number(row.cost_usd ?? 0));
    }
    const groups = groupsRaw.map((g) => ({
      ...g,
      delta: computeDelta(
        Number(g.cost_usd ?? 0),
        prevByKey.get(g.key ?? "") ?? 0,
      ),
    }));
    return { success: true, fromDays, groups };
  }

  static async getByAction(
    db: DrizzleD1Database,
    fromDaysRaw?: string,
    app?: string,
  ) {
    const fromDays = parseFromDays(fromDaysRaw);
    const fromTs = Date.now() - fromDays * dayMs;
    const groups = await UsageEventRepository.crossTenantGroupBy(
      db,
      "action",
      fromTs,
      app,
    );
    return { success: true, fromDays, app: app ?? null, groups };
  }
}

export default AdminUsageService;
