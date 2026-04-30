import { eq, and, sql } from "drizzle-orm";
import { DrizzleD1Database } from "drizzle-orm/d1";
import Tenant from "../models/tenant.model";
import ApiKey from "../models/api-key.model";

class TenantRepository {
  static async create(
    db: DrizzleD1Database,
    payload: typeof Tenant.$inferInsert,
  ) {
    const [created] = await db.insert(Tenant).values(payload).returning();
    return created;
  }

  static async fetchById(db: DrizzleD1Database, id: string) {
    const [row] = await db.select().from(Tenant).where(eq(Tenant.id, id));
    return row;
  }

  static async fetchByName(db: DrizzleD1Database, name: string) {
    const [row] = await db.select().from(Tenant).where(eq(Tenant.name, name));
    return row;
  }

  static async fetchByClerkOrgId(db: DrizzleD1Database, clerkOrgId: string) {
    const [row] = await db
      .select()
      .from(Tenant)
      .where(eq(Tenant.clerk_org_id, clerkOrgId));
    return row;
  }

  static async fetchByClerkUserId(db: DrizzleD1Database, clerkUserId: string) {
    const [row] = await db
      .select()
      .from(Tenant)
      .where(eq(Tenant.clerk_user_id, clerkUserId));
    return row;
  }

  static async fetchAll(db: DrizzleD1Database) {
    return db
      .select({
        id: Tenant.id,
        name: Tenant.name,
        clerk_org_id: Tenant.clerk_org_id,
        plan: Tenant.plan,
        created_at: Tenant.created_at,
        updated_at: Tenant.updated_at,
        api_key_count: sql<number>`(
          SELECT COUNT(*) FROM ${ApiKey}
          WHERE ${ApiKey.tenant_id} = ${Tenant.id}
            AND ${ApiKey.revoked_at} IS NULL
        )`,
      })
      .from(Tenant)
      .orderBy(Tenant.name);
  }

  static async update(
    db: DrizzleD1Database,
    id: string,
    update: Partial<typeof Tenant.$inferInsert>,
  ) {
    const [updated] = await db
      .update(Tenant)
      .set(update)
      .where(eq(Tenant.id, id))
      .returning();
    return updated;
  }

  static async delete(db: DrizzleD1Database, id: string) {
    const [deleted] = await db
      .delete(Tenant)
      .where(eq(Tenant.id, id))
      .returning();
    return deleted;
  }
}

export { TenantRepository };
