import { eq, and, desc } from "drizzle-orm";
import { DrizzleD1Database } from "drizzle-orm/d1";
import App from "../models/app.model";

class AppRepository {
  static async create(db: DrizzleD1Database, payload: typeof App.$inferInsert) {
    const [created] = await db.insert(App).values(payload).returning();
    return created;
  }

  static async fetchByTenant(db: DrizzleD1Database, tenant_id: string) {
    return db
      .select()
      .from(App)
      .where(eq(App.tenant_id, tenant_id))
      .orderBy(desc(App.created_at));
  }

  static async fetchById(db: DrizzleD1Database, id: string) {
    const [row] = await db.select().from(App).where(eq(App.id, id));
    return row;
  }

  static async fetchBySlug(
    db: DrizzleD1Database,
    tenant_id: string,
    slug: string,
  ) {
    const [row] = await db
      .select()
      .from(App)
      .where(and(eq(App.tenant_id, tenant_id), eq(App.slug, slug)));
    return row;
  }

  static async update(
    db: DrizzleD1Database,
    id: string,
    update: Partial<typeof App.$inferInsert>,
  ) {
    const [updated] = await db
      .update(App)
      .set({ ...update, updated_at: new Date().toISOString() })
      .where(eq(App.id, id))
      .returning();
    return updated;
  }

  static async remove(db: DrizzleD1Database, id: string) {
    const [deleted] = await db.delete(App).where(eq(App.id, id)).returning();
    return deleted;
  }
}

export { AppRepository };
