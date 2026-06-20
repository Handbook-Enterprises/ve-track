import { eq, and, desc } from "drizzle-orm";
import { DrizzleD1Database } from "drizzle-orm/d1";
import Model from "../models/model.model";

class ModelRepository {
  static async create(
    db: DrizzleD1Database,
    payload: typeof Model.$inferInsert,
  ) {
    const [created] = await db.insert(Model).values(payload).returning();
    return created;
  }

  static async fetchByTenant(db: DrizzleD1Database, tenant_id: string) {
    return db
      .select()
      .from(Model)
      .where(eq(Model.tenant_id, tenant_id))
      .orderBy(desc(Model.created_at));
  }

  static async fetchById(db: DrizzleD1Database, id: string) {
    const [row] = await db.select().from(Model).where(eq(Model.id, id));
    return row;
  }

  static async fetchByKey(
    db: DrizzleD1Database,
    tenant_id: string,
    provider: string,
    model_id: string,
  ) {
    const [row] = await db
      .select()
      .from(Model)
      .where(
        and(
          eq(Model.tenant_id, tenant_id),
          eq(Model.provider, provider),
          eq(Model.model_id, model_id),
        ),
      );
    return row;
  }

  static async update(
    db: DrizzleD1Database,
    id: string,
    update: Partial<typeof Model.$inferInsert>,
  ) {
    const [updated] = await db
      .update(Model)
      .set({ ...update, updated_at: new Date().toISOString() })
      .where(eq(Model.id, id))
      .returning();
    return updated;
  }

  static async remove(db: DrizzleD1Database, id: string) {
    const [deleted] = await db.delete(Model).where(eq(Model.id, id)).returning();
    return deleted;
  }
}

export { ModelRepository };
