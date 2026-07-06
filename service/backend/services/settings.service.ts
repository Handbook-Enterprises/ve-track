import { DrizzleD1Database } from "drizzle-orm/d1";
import { SettingsRepository } from "../repositories/settings.repository";

export interface TenantSettingsShape {
  models_friendly_names: boolean;
  credit_price_usd: number | null;
}

const DEFAULTS: TenantSettingsShape = {
  models_friendly_names: false,
  credit_price_usd: null,
};

const shape = (row: {
  models_friendly_names?: boolean | null;
  credit_price_usd?: number | null;
} | null): TenantSettingsShape => ({
  models_friendly_names:
    row?.models_friendly_names ?? DEFAULTS.models_friendly_names,
  credit_price_usd: row?.credit_price_usd ?? DEFAULTS.credit_price_usd,
});

const isValidCreditPrice = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0;

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
    if (body.credit_price_usd === null) {
      patch.credit_price_usd = null;
    } else if (isValidCreditPrice(body.credit_price_usd)) {
      patch.credit_price_usd = body.credit_price_usd;
    }
    const row = await SettingsRepository.upsert(db, tenantId, patch);
    return { success: true, settings: shape(row) };
  }
}

export default SettingsService;
