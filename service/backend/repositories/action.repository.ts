import { eq, and, isNull, desc } from "drizzle-orm";
import { DrizzleD1Database } from "drizzle-orm/d1";
import Action from "../models/action.model";

class ActionRepository {
  static async create(
    db: DrizzleD1Database,
    payload: typeof Action.$inferInsert,
  ) {
    const [created] = await db.insert(Action).values(payload).returning();
    return created;
  }

  static async fetchByTenant(db: DrizzleD1Database, tenant_id: string) {
    return db
      .select()
      .from(Action)
      .where(eq(Action.tenant_id, tenant_id))
      .orderBy(desc(Action.created_at));
  }

  static async fetchById(db: DrizzleD1Database, id: string) {
    const [row] = await db.select().from(Action).where(eq(Action.id, id));
    return row;
  }

  static async fetchBySlug(
    db: DrizzleD1Database,
    tenant_id: string,
    app_slug: string | null,
    slug: string,
  ) {
    const [row] = await db
      .select()
      .from(Action)
      .where(
        and(
          eq(Action.tenant_id, tenant_id),
          app_slug == null
            ? isNull(Action.app_slug)
            : eq(Action.app_slug, app_slug),
          eq(Action.slug, slug),
        ),
      );
    return row;
  }

  static async update(
    db: DrizzleD1Database,
    id: string,
    update: Partial<typeof Action.$inferInsert>,
  ) {
    const [updated] = await db
      .update(Action)
      .set({ ...update, updated_at: new Date().toISOString() })
      .where(eq(Action.id, id))
      .returning();
    return updated;
  }

  static async remove(db: DrizzleD1Database, id: string) {
    const [deleted] = await db.delete(Action).where(eq(Action.id, id)).returning();
    return deleted;
  }
}

export { ActionRepository };
