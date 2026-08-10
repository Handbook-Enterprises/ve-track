import { and, eq } from "drizzle-orm";
import { DrizzleD1Database } from "drizzle-orm/d1";
import ProviderCreditPrice from "../models/provider-credit-price.model";

class ProviderCreditPriceRepository {
  static async listByTenant(db: DrizzleD1Database, tenant_id: string) {
    return db
      .select()
      .from(ProviderCreditPrice)
      .where(eq(ProviderCreditPrice.tenant_id, tenant_id));
  }

  /**
   * provider -> USD per credit, for one tenant.
   *
   * Read once per ingest batch rather than per event: a batch is usually one
   * command's worth of calls against one or two providers, so this is a single
   * small query either way, and doing it per row would make a 100-event batch
   * 100 round trips.
   */
  static async fetchMap(
    db: DrizzleD1Database,
    tenant_id: string,
  ): Promise<Map<string, number>> {
    const rows = await this.listByTenant(db, tenant_id);
    const map = new Map<string, number>();
    for (const r of rows) {
      if (typeof r.credit_price_usd === "number" && Number.isFinite(r.credit_price_usd)) {
        map.set(r.provider, r.credit_price_usd);
      }
    }
    return map;
  }

  static async upsert(
    db: DrizzleD1Database,
    tenant_id: string,
    provider: string,
    credit_price_usd: number,
    note?: string | null,
  ) {
    const [existing] = await db
      .select()
      .from(ProviderCreditPrice)
      .where(
        and(
          eq(ProviderCreditPrice.tenant_id, tenant_id),
          eq(ProviderCreditPrice.provider, provider),
        ),
      );
    if (existing) {
      const [updated] = await db
        .update(ProviderCreditPrice)
        .set({
          credit_price_usd,
          note: note ?? existing.note,
          updated_at: new Date().toISOString(),
        })
        .where(eq(ProviderCreditPrice.id, existing.id))
        .returning();
      return updated;
    }
    const [created] = await db
      .insert(ProviderCreditPrice)
      .values({ tenant_id, provider, credit_price_usd, note: note ?? null })
      .returning();
    return created;
  }

  static async remove(db: DrizzleD1Database, tenant_id: string, provider: string) {
    await db
      .delete(ProviderCreditPrice)
      .where(
        and(
          eq(ProviderCreditPrice.tenant_id, tenant_id),
          eq(ProviderCreditPrice.provider, provider),
        ),
      );
  }
}

export default ProviderCreditPriceRepository;
