import { eq } from "drizzle-orm";
import { DrizzleD1Database } from "drizzle-orm/d1";
import TenantSettings from "../models/settings.model";

class SettingsRepository {
  static async fetchByTenant(db: DrizzleD1Database, tenant_id: string) {
    const [row] = await db
      .select()
      .from(TenantSettings)
      .where(eq(TenantSettings.tenant_id, tenant_id));
    return row ?? null;
  }

  static async upsert(
    db: DrizzleD1Database,
    tenant_id: string,
    patch: Partial<typeof TenantSettings.$inferInsert>,
  ) {
    const existing = await this.fetchByTenant(db, tenant_id);
    if (existing) {
      const [updated] = await db
        .update(TenantSettings)
        .set({ ...patch, updated_at: new Date().toISOString() })
        .where(eq(TenantSettings.tenant_id, tenant_id))
        .returning();
      return updated;
    }
    const [created] = await db
      .insert(TenantSettings)
      .values({ tenant_id, ...patch })
      .returning();
    return created;
  }
}

export { SettingsRepository };
