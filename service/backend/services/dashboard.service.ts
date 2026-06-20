import { DrizzleD1Database } from "drizzle-orm/d1";
import { TenantRepository } from "../repositories/tenant.repository";
import ApiKeyService from "./api-key.service";
import UsageEventService from "./usage-event.service";
import TrackerService from "./tracker.service";
import { resolveIdentities } from "../lib/clerk-identities";
import type { ApiKeyCreateBody } from "../interfaces/api-key.interface";
import type {
  TrackerCreateBody,
  TrackerUpdateKeyBody,
} from "../interfaces/tracker.interface";
import type {
  UsageGroup,
  UsageQuery,
} from "../interfaces/usage-event.interface";
import type { Env } from "../types";

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

  static async listTrackers(db: DrizzleD1Database, tenantId: string) {
    return TrackerService.listForTenant(db, tenantId);
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
    const [byApp, byOrg, byUser, byProvider, byModel, byAction, totals, series] =
      await Promise.all([
        UsageEventService.getByApp(db, tenantId, query),
        UsageEventService.getByOrg(db, tenantId, query),
        UsageEventService.getByUser(db, tenantId, query),
        UsageEventService.getByProvider(db, tenantId, query),
        UsageEventService.getByModel(db, tenantId, query),
        UsageEventService.getByAction(db, tenantId, query),
        UsageEventService.getTotals(db, tenantId, query),
        UsageEventService.getSeries(db, tenantId, query),
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

    return {
      success: true,
      overview: {
        fromDays: totals.totals.fromDays,
        totals: totals.totals,
        byApp: byApp.groups,
        byOrg: enrichedByOrg,
        byUser: enrichedByUser,
        byProvider: byProvider.groups,
        byModel: byModel.groups,
        byAction: byAction.groups,
        series,
      },
    };
  }

  static async runCanary(db: DrizzleD1Database, tenantId: string) {
    return UsageEventService.runCanary(db, tenantId);
  }
}

export default DashboardService;
