import { eq, and, isNull, desc } from "drizzle-orm";
import { DrizzleD1Database } from "drizzle-orm/d1";
import ApiKey from "../models/api-key.model";

class ApiKeyRepository {
  static async create(
    db: DrizzleD1Database,
    payload: typeof ApiKey.$inferInsert,
  ) {
    const [created] = await db.insert(ApiKey).values(payload).returning();
    return created;
  }

  static async fetchById(db: DrizzleD1Database, id: string) {
    const [row] = await db.select().from(ApiKey).where(eq(ApiKey.id, id));
    return row;
  }

  static async fetchActiveByHash(db: DrizzleD1Database, hashed_key: string) {
    const [row] = await db
      .select()
      .from(ApiKey)
      .where(and(eq(ApiKey.hashed_key, hashed_key), isNull(ApiKey.revoked_at)));
    return row;
  }

  static async fetchByTenant(db: DrizzleD1Database, tenant_id: string) {
    return db
      .select({
        id: ApiKey.id,
        tenant_id: ApiKey.tenant_id,
        name: ApiKey.name,
        prefix: ApiKey.prefix,
        revoked_at: ApiKey.revoked_at,
        created_at: ApiKey.created_at,
        updated_at: ApiKey.updated_at,
      })
      .from(ApiKey)
      .where(eq(ApiKey.tenant_id, tenant_id))
      .orderBy(desc(ApiKey.created_at));
  }

  static async revoke(db: DrizzleD1Database, id: string) {
    const [updated] = await db
      .update(ApiKey)
      .set({ revoked_at: Date.now() })
      .where(eq(ApiKey.id, id))
      .returning();
    return updated;
  }
}

export { ApiKeyRepository };
