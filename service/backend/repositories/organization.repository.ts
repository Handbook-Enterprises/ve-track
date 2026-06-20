import { eq, and, desc } from "drizzle-orm";
import { DrizzleD1Database } from "drizzle-orm/d1";
import Organization from "../models/organization.model";

class OrganizationRepository {
  static async create(
    db: DrizzleD1Database,
    payload: typeof Organization.$inferInsert,
  ) {
    const [created] = await db.insert(Organization).values(payload).returning();
    return created;
  }

  static async fetchByTenant(db: DrizzleD1Database, tenant_id: string) {
    return db
      .select()
      .from(Organization)
      .where(eq(Organization.tenant_id, tenant_id))
      .orderBy(desc(Organization.created_at));
  }

  static async fetchById(db: DrizzleD1Database, id: string) {
    const [row] = await db
      .select()
      .from(Organization)
      .where(eq(Organization.id, id));
    return row;
  }

  static async fetchByExternalId(
    db: DrizzleD1Database,
    tenant_id: string,
    external_id: string,
  ) {
    const [row] = await db
      .select()
      .from(Organization)
      .where(
        and(
          eq(Organization.tenant_id, tenant_id),
          eq(Organization.external_id, external_id),
        ),
      );
    return row;
  }

  static async update(
    db: DrizzleD1Database,
    id: string,
    update: Partial<typeof Organization.$inferInsert>,
  ) {
    const [updated] = await db
      .update(Organization)
      .set({ ...update, updated_at: new Date().toISOString() })
      .where(eq(Organization.id, id))
      .returning();
    return updated;
  }

  static async remove(db: DrizzleD1Database, id: string) {
    const [deleted] = await db
      .delete(Organization)
      .where(eq(Organization.id, id))
      .returning();
    return deleted;
  }
}

export { OrganizationRepository };
