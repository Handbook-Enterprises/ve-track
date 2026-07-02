import { DrizzleD1Database } from "drizzle-orm/d1";
import { CreditRepository, type CreditFilters } from "../repositories/credit.repository";
import { computeMargin, resolveWindow, type UsageWindow } from "./usage-event.service";
import { UsageEventMessages } from "../messages/usage-event.messages";
import type { UsageQuery } from "../interfaces/usage-event.interface";

type CreditDimension = "app" | "action" | "clerk_org_id" | "clerk_user_id";

const DIM_MAP: Record<string, CreditDimension> = {
  app: "app",
  action: "action",
  org: "clerk_org_id",
  clerk_org_id: "clerk_org_id",
  user: "clerk_user_id",
  clerk_user_id: "clerk_user_id",
};

const resolveDim = (raw?: string): CreditDimension => DIM_MAP[raw ?? ""] ?? "app";

const creditFilters = (
  tenantId: string,
  query: UsageQuery,
  window: UsageWindow,
): CreditFilters => ({
  tenant_id: tenantId,
  fromTs: window.fromTs,
  toTs: window.toTs,
  app: query.app || undefined,
  clerk_org_id: query.clerk_org_id || undefined,
  clerk_user_id: query.clerk_user_id || undefined,
  action: query.action || undefined,
  correlation_id: query.correlation_id || undefined,
});

const withMargin = (r: {
  key: string | null;
  credits: number;
  revenue_usd: number;
  cost_usd: number;
  charges: number;
}) => {
  const revenue = Number(r.revenue_usd ?? 0);
  const cost = Number(r.cost_usd ?? 0);
  const { margin_usd, margin_pct } = computeMargin(revenue, cost);
  return {
    key: r.key,
    credits: Number(r.credits ?? 0),
    revenue_usd: revenue,
    cost_usd: cost,
    margin_usd,
    margin_pct,
    charges: Number(r.charges ?? 0),
  };
};

class CreditService {
  static async getSummary(
    db: DrizzleD1Database,
    tenantId: string,
    query: UsageQuery,
  ) {
    const window = resolveWindow(query);
    const filters = creditFilters(tenantId, query, window);
    const [byApp, byAction, byOrg, byUser, totals, prev, series] =
      await Promise.all([
        CreditRepository.groupBy(db, "app", filters),
        CreditRepository.groupBy(db, "action", filters),
        CreditRepository.groupBy(db, "clerk_org_id", filters),
        CreditRepository.groupBy(db, "clerk_user_id", filters),
        CreditRepository.totals(db, filters),
        CreditRepository.previousTotals(db, filters, window.fromDays),
        CreditRepository.dailySeries(db, filters),
      ]);

    const revenue = Number(totals.revenue_usd ?? 0);
    const cost = Number(totals.cost_usd ?? 0);
    const { margin_usd, margin_pct } = computeMargin(revenue, cost);
    const previousRevenue = Number(prev.revenue_usd ?? 0);
    let pctChange: number | null = null;
    let direction: "up" | "down" | "flat" = "flat";
    if (previousRevenue > 0) {
      pctChange = ((revenue - previousRevenue) / previousRevenue) * 100;
      direction = pctChange > 0.5 ? "up" : pctChange < -0.5 ? "down" : "flat";
    } else if (revenue > 0) {
      direction = "up";
    }

    return {
      success: true,
      message: UsageEventMessages.FETCH_SUCCESS,
      summary: {
        fromDays: window.fromDays,
        totals: {
          credits: Number(totals.credits ?? 0),
          revenue_usd: revenue,
          cost_usd: cost,
          margin_usd,
          margin_pct,
          charges: Number(totals.charges ?? 0),
          fromDays: window.fromDays,
          delta: { previousRevenue, pctChange, direction },
        },
        byApp: byApp.filter((g) => g.key !== "canary").map(withMargin),
        byAction: byAction.map(withMargin),
        byOrg: byOrg.map(withMargin),
        byUser: byUser.map(withMargin),
        series: series.map((s) => ({
          day: s.day,
          credits: Number(s.credits ?? 0),
          revenue_usd: Number(s.revenue_usd ?? 0),
          cost_usd: Number(s.cost_usd ?? 0),
        })),
      },
    };
  }

  static async getDetail(
    db: DrizzleD1Database,
    tenantId: string,
    query: UsageQuery,
  ) {
    const window = resolveWindow(query);
    const filters = creditFilters(tenantId, query, window);
    const [byAction, byOrg, byUser, totals, series] = await Promise.all([
      CreditRepository.groupBy(db, "action", filters),
      CreditRepository.groupBy(db, "clerk_org_id", filters),
      CreditRepository.groupBy(db, "clerk_user_id", filters),
      CreditRepository.totals(db, filters),
      CreditRepository.dailySeries(db, filters),
    ]);
    const revenue = Number(totals.revenue_usd ?? 0);
    const cost = Number(totals.cost_usd ?? 0);
    const { margin_usd, margin_pct } = computeMargin(revenue, cost);
    return {
      success: true,
      message: UsageEventMessages.FETCH_SUCCESS,
      detail: {
        fromDays: window.fromDays,
        totals: {
          credits: Number(totals.credits ?? 0),
          revenue_usd: revenue,
          cost_usd: cost,
          margin_usd,
          margin_pct,
          charges: Number(totals.charges ?? 0),
        },
        byAction: byAction.map(withMargin),
        byOrg: byOrg.map(withMargin),
        byUser: byUser.map(withMargin),
        series: series.map((s) => ({
          day: s.day,
          credits: Number(s.credits ?? 0),
          revenue_usd: Number(s.revenue_usd ?? 0),
          cost_usd: Number(s.cost_usd ?? 0),
        })),
      },
    };
  }
}

export default CreditService;
export { resolveDim };
