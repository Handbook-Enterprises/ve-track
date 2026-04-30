import { DrizzleD1Database } from "drizzle-orm/d1";
import { TenantRepository } from "../repositories/tenant.repository";
import ApiKeyService from "./api-key.service";
import UsageEventService from "./usage-event.service";
import type {
  ApiKeyCreateBody,
} from "../interfaces/api-key.interface";
import type { UsageQuery } from "../interfaces/usage-event.interface";

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

  static async getOverview(
    db: DrizzleD1Database,
    tenantId: string,
    query: UsageQuery,
  ) {
    const [byApp, byOrg, byUser, byProvider, byModel, totals] =
      await Promise.all([
        UsageEventService.getByApp(db, tenantId, query),
        UsageEventService.getByOrg(db, tenantId, query),
        UsageEventService.getByUser(db, tenantId, query),
        UsageEventService.getByProvider(db, tenantId, query),
        UsageEventService.getByModel(db, tenantId, query),
        UsageEventService.getTotals(db, tenantId, query),
      ]);

    return {
      success: true,
      overview: {
        fromDays: totals.totals.fromDays,
        totals: totals.totals,
        byApp: byApp.groups,
        byOrg: byOrg.groups,
        byUser: byUser.groups,
        byProvider: byProvider.groups,
        byModel: byModel.groups,
      },
    };
  }

  static async runCanary(db: DrizzleD1Database, tenantId: string) {
    return UsageEventService.runCanary(db, tenantId);
  }
}

export default DashboardService;
