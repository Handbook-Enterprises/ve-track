import { DrizzleD1Database } from "drizzle-orm/d1";
import { TenantRepository } from "../repositories/tenant.repository";
import { ModelRepository } from "../repositories/model.repository";
import ApiKeyService from "./api-key.service";
import UsageEventService, {
  computeMargin,
  resolveWindow,
} from "./usage-event.service";
import TrackerService from "./tracker.service";
import SettingsService from "./settings.service";
import { resolveIdentities } from "../lib/clerk-identities";
import type { ApiKeyCreateBody } from "../interfaces/api-key.interface";
import type {
  TrackerCreateBody,
  TrackerUpdateKeyBody,
} from "../interfaces/tracker.interface";
import type {
  CreditsDeltas,
  CreditsOverview,
  ProfitabilityGroup,
  ProfitabilitySeriesPoint,
  UsageDelta,
  UsageGroup,
  UsageQuery,
  UsageSeriesPoint,
} from "../interfaces/usage-event.interface";
import type { Env } from "../types";

const deriveDelta = (previousCost: number, currentCost: number): UsageDelta => {
  let pctChange: number | null = null;
  let direction: "up" | "down" | "flat" = "flat";
  if (previousCost > 0) {
    pctChange = ((currentCost - previousCost) / previousCost) * 100;
    direction = pctChange > 0.5 ? "up" : pctChange < -0.5 ? "down" : "flat";
  } else if (currentCost > 0) {
    pctChange = null;
    direction = "up";
  }
  return { previousCost, pctChange, direction };
};

class DashboardService {
  static async getMe(db: DrizzleD1Database, tenantId: string) {
    const tenant = await TenantRepository.fetchById(db, tenantId);
    return {
      success: true,
      tenant,
    };
  }

  static async listApiKeys(db: DrizzleD1Database, tenantId: string) {
    return ApiKeyService.listForTenant(db, tenantId);
  }

  static async createApiKey(
    db: DrizzleD1Database,
    tenantId: string,
    body: ApiKeyCreateBody,
  ) {
    return ApiKeyService.create(db, tenantId, body);
  }

  static async revokeApiKey(db: DrizzleD1Database, id: string) {
    return ApiKeyService.revoke(db, id);
  }

  static async listTrackers(
    db: DrizzleD1Database,
    tenantId: string,
    query?: { from?: string; to?: string },
  ) {
    return TrackerService.listForTenant(db, tenantId, query);
  }

  static async createTracker(
    db: DrizzleD1Database,
    env: Env,
    tenantId: string,
    body: TrackerCreateBody,
  ) {
    return TrackerService.create(db, env, tenantId, body);
  }

  static async disconnectTracker(
    db: DrizzleD1Database,
    tenantId: string,
    id: string,
  ) {
    return TrackerService.disconnect(db, tenantId, id);
  }

  static async syncTracker(db: DrizzleD1Database, env: Env, id: string) {
    return TrackerService.sync(db, env, id);
  }

  static async updateTrackerKey(
    db: DrizzleD1Database,
    env: Env,
    tenantId: string,
    id: string,
    body: TrackerUpdateKeyBody,
  ) {
    return TrackerService.updateKey(db, env, tenantId, id, body);
  }

  static async getTrackerCosts(
    db: DrizzleD1Database,
    tenantId: string,
    id: string,
    query: { from?: string; to?: string },
  ) {
    return TrackerService.getCostDetail(db, tenantId, id, query);
  }

  static async getOverview(
    db: DrizzleD1Database,
    env: Env,
    tenantId: string,
    query: UsageQuery,
  ) {
    const window = resolveWindow(query);
    const lifetime = query.lifetime === "1" || query.lifetime === "true";
    const trackerContribution = await TrackerService.getOverviewContribution(
      db,
      tenantId,
      window,
      lifetime,
    );
    const trackedProviders = [...trackerContribution.byProvider.keys()];

    const [byApp, byOrg, byUser, byProvider, byModel, byAction, totals, series] =
      await Promise.all([
        UsageEventService.getByApp(db, tenantId, query),
        UsageEventService.getByOrg(db, tenantId, query),
        UsageEventService.getByUser(db, tenantId, query),
        UsageEventService.getByProvider(db, tenantId, query, trackedProviders),
        UsageEventService.getByModel(db, tenantId, query),
        UsageEventService.getByAction(db, tenantId, query),
        UsageEventService.getTotals(db, tenantId, query, trackedProviders),
        UsageEventService.getSeries(db, tenantId, query, trackedProviders),
      ]);

    const userIds = byUser.groups
      .map((g) => g.key)
      .filter((id): id is string => !!id);
    const orgIds = byOrg.groups
      .map((g) => g.key)
      .filter((id): id is string => !!id);
    const { users, orgs } = await resolveIdentities(env, userIds, orgIds);

    const enrich = (
      groups: UsageGroup[],
      lookup: Map<
        string,
        { name: string; secondary: string | null; imageUrl?: string | null }
      >,
    ): UsageGroup[] =>
      groups.map((g) => {
        const id = g.key;
        const hit = id ? lookup.get(id) : null;
        return {
          ...g,
          name: hit?.name ?? null,
          secondary: hit?.secondary ?? null,
          imageUrl: hit?.imageUrl ?? null,
        };
      });

    const enrichedByUser = enrich(byUser.groups, users);
    const enrichedByOrg = enrich(byOrg.groups, orgs);

    const settings = await SettingsService.resolve(db, tenantId);
    let byModelGroups = byModel.groups;
    if (settings.models_friendly_names) {
      const models = await ModelRepository.fetchByTenant(db, tenantId);
      const modelMap = new Map(
        models.map((m) => [
          m.model_id,
          { name: m.name, secondary: m.provider, imageUrl: null },
        ]),
      );
      byModelGroups = enrich(byModel.groups, modelMap);
    }

    const mergedCost = totals.totals.cost_usd + trackerContribution.totals.cost_usd;
    const eventPreviousCost = totals.totals.delta?.previousCost ?? 0;
    const trackerDominant =
      trackerContribution.totals.cost_usd >= totals.totals.cost_usd;
    const insufficientHistory =
      trackerDominant && !trackerContribution.previousCovered;
    let mergedDelta: UsageDelta | undefined;
    if (!lifetime) {
      mergedDelta =
        insufficientHistory && mergedCost > 0
          ? { previousCost: 0, pctChange: null, direction: "up" }
          : deriveDelta(
              eventPreviousCost + trackerContribution.previousCost,
              mergedCost,
            );
    }
    const mergedTotals = {
      ...totals.totals,
      cost_usd: mergedCost,
      delta: mergedDelta,
    };

    const mergedByProvider: UsageGroup[] = byProvider.groups.map((g) => ({
      ...g,
    }));
    for (const [provider, value] of trackerContribution.byProvider) {
      const existing = mergedByProvider.find((g) => g.key === provider);
      if (existing) existing.cost_usd += value.cost_usd;
      else
        mergedByProvider.push({
          key: provider,
          cost_usd: value.cost_usd,
          prompt_tokens: 0,
          completion_tokens: 0,
          credits: 0,
          requests: 0,
        });
    }
    mergedByProvider.sort((a, b) => b.cost_usd - a.cost_usd);

    const mergedSeries: UsageSeriesPoint[] = series.map((p) => ({ ...p }));
    for (const [day, value] of trackerContribution.series) {
      const point = mergedSeries.find((p) => p.day === day);
      if (point) point.cost_usd += value.cost_usd;
      else
        mergedSeries.push({
          day,
          cost_usd: value.cost_usd,
          credits: 0,
          requests: 0,
        });
    }
    mergedSeries.sort((a, b) => a.day.localeCompare(b.day));

    return {
      success: true,
      overview: {
        fromDays: mergedTotals.fromDays,
        totals: mergedTotals,
        byApp: byApp.groups,
        byOrg: enrichedByOrg,
        byUser: enrichedByUser,
        byProvider: mergedByProvider,
        byModel: byModelGroups,
        byAction: byAction.groups,
        series: mergedSeries,
      },
    };
  }

  static async getCredits(
    db: DrizzleD1Database,
    env: Env,
    tenantId: string,
    query: UsageQuery,
  ) {
    const window = resolveWindow(query);
    const lifetime = query.lifetime === "1" || query.lifetime === "true";
    const trackerContribution = await TrackerService.getOverviewContribution(
      db,
      tenantId,
      window,
      lifetime,
    );
    const trackedProviders = [...trackerContribution.byProvider.keys()];

    const [
      byApp,
      byAction,
      byUser,
      byOrg,
      byProvider,
      byModel,
      fullTotals,
      exclTotals,
      fullSeries,
      exclSeries,
      settings,
    ] = await Promise.all([
      UsageEventService.getProfitabilityBy(db, tenantId, "app", query),
      UsageEventService.getProfitabilityBy(db, tenantId, "action", query),
      UsageEventService.getProfitabilityBy(db, tenantId, "user", query),
      UsageEventService.getProfitabilityBy(db, tenantId, "org", query),
      UsageEventService.getProfitabilityBy(db, tenantId, "provider", query),
      UsageEventService.getProfitabilityBy(db, tenantId, "model", query),
      UsageEventService.getProfitabilityWindowTotals(db, tenantId, query),
      UsageEventService.getProfitabilityWindowTotals(
        db,
        tenantId,
        query,
        trackedProviders,
      ),
      UsageEventService.getProfitabilitySeries(db, tenantId, query),
      UsageEventService.getProfitabilitySeries(
        db,
        tenantId,
        query,
        trackedProviders,
      ),
      SettingsService.resolve(db, tenantId),
    ]);

    const userIds = byUser.groups
      .map((g) => g.key)
      .filter((id): id is string => !!id);
    const orgIds = byOrg.groups
      .map((g) => g.key)
      .filter((id): id is string => !!id);
    const { users, orgs } = await resolveIdentities(env, userIds, orgIds);

    const enrich = (
      groups: ProfitabilityGroup[],
      lookup: Map<
        string,
        { name: string; secondary: string | null; imageUrl?: string | null }
      >,
    ): ProfitabilityGroup[] =>
      groups.map((g) => {
        const hit = g.key ? lookup.get(g.key) : null;
        return {
          ...g,
          name: hit?.name ?? null,
          secondary: hit?.secondary ?? null,
          imageUrl: hit?.imageUrl ?? null,
        };
      });

    const enrichedByUser = enrich(byUser.groups, users);
    const enrichedByOrg = enrich(byOrg.groups, orgs);

    let byModelGroups = byModel.groups;
    if (settings.models_friendly_names) {
      const models = await ModelRepository.fetchByTenant(db, tenantId);
      const modelMap = new Map(
        models.map((m) => [
          m.model_id,
          { name: m.name, secondary: m.provider, imageUrl: null },
        ]),
      );
      byModelGroups = enrich(byModel.groups, modelMap);
    }

    const revenue = fullTotals.current.revenue_usd;
    const credits = fullTotals.current.credits_charged;
    const blendedCost =
      exclTotals.current.cost_usd + trackerContribution.totals.cost_usd;
    const { margin_usd, margin_pct } = computeMargin(revenue, blendedCost);

    let deltas: CreditsDeltas | undefined;
    if (!lifetime) {
      const trackerDominant =
        trackerContribution.totals.cost_usd >= exclTotals.current.cost_usd;
      const insufficientHistory =
        trackerDominant && !trackerContribution.previousCovered;
      const costDelta =
        insufficientHistory && blendedCost > 0
          ? ({ previousCost: 0, pctChange: null, direction: "up" } as UsageDelta)
          : deriveDelta(
              exclTotals.previous.cost_usd + trackerContribution.previousCost,
              blendedCost,
            );
      deltas = {
        revenue: deriveDelta(fullTotals.previous.revenue_usd, revenue),
        cost: costDelta,
        credits: deriveDelta(fullTotals.previous.credits_charged, credits),
      };
    }

    const seriesMap = new Map<string, ProfitabilitySeriesPoint>();
    for (const p of fullSeries) {
      seriesMap.set(p.day, {
        day: p.day,
        revenue_usd: p.revenue_usd,
        cost_usd: 0,
        margin_usd: 0,
        credits: p.credits,
        requests: p.requests,
      });
    }
    const ensureDay = (day: string) => {
      const existing = seriesMap.get(day);
      if (existing) return existing;
      const created: ProfitabilitySeriesPoint = {
        day,
        revenue_usd: 0,
        cost_usd: 0,
        margin_usd: 0,
        credits: 0,
        requests: 0,
      };
      seriesMap.set(day, created);
      return created;
    };
    for (const p of exclSeries) ensureDay(p.day).cost_usd += p.cost_usd;
    for (const [day, value] of trackerContribution.series)
      ensureDay(day).cost_usd += value.cost_usd;
    const series = [...seriesMap.values()]
      .map((p) => ({ ...p, margin_usd: p.revenue_usd - p.cost_usd }))
      .sort((a, b) => a.day.localeCompare(b.day));

    const overview: CreditsOverview = {
      fromDays: fullTotals.window.fromDays,
      creditPriceUsd: settings.credit_price_usd,
      totals: {
        revenue_usd: revenue,
        cost_usd: blendedCost,
        margin_usd,
        margin_pct,
        credits_charged: credits,
        requests: fullTotals.current.requests,
        fromDays: fullTotals.window.fromDays,
        deltas,
      },
      series,
      byApp: byApp.groups,
      byAction: byAction.groups,
      byUser: enrichedByUser,
      byOrg: enrichedByOrg,
      byProvider: byProvider.groups,
      byModel: byModelGroups,
    };

    return { success: true, credits: overview };
  }

  static async runCanary(db: DrizzleD1Database, tenantId: string) {
    return UsageEventService.runCanary(db, tenantId);
  }
}

export default DashboardService;
