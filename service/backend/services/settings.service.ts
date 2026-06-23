import { DrizzleD1Database } from "drizzle-orm/d1";
import { SettingsRepository } from "../repositories/settings.repository";

export interface TenantSettingsShape {
  models_friendly_names: boolean;
}

const DEFAULTS: TenantSettingsShape = {
  models_friendly_names: false,
};

const shape = (row: {
  models_friendly_names?: boolean | null;
} | null): TenantSettingsShape => ({
  models_friendly_names:
    row?.models_friendly_names ?? DEFAULTS.models_friendly_names,
});

class SettingsService {
  static async resolve(
    db: DrizzleD1Database,
    tenantId: string,
  ): Promise<TenantSettingsShape> {
    return shape(await SettingsRepository.fetchByTenant(db, tenantId));
  }

  static async get(db: DrizzleD1Database, tenantId: string) {
    return { success: true, settings: await this.resolve(db, tenantId) };
  }

  static async update(
    db: DrizzleD1Database,
    tenantId: string,
    body: Partial<TenantSettingsShape>,
  ) {
    const patch: Partial<TenantSettingsShape> = {};
    if (typeof body.models_friendly_names === "boolean") {
      patch.models_friendly_names = body.models_friendly_names;
    }
    const row = await SettingsRepository.upsert(db, tenantId, patch);
    return { success: true, settings: shape(row) };
  }
}

export default SettingsService;
