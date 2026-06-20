import { eq, and, desc } from "drizzle-orm";
import { DrizzleD1Database } from "drizzle-orm/d1";
import Person from "../models/person.model";

class PersonRepository {
  static async create(
    db: DrizzleD1Database,
    payload: typeof Person.$inferInsert,
  ) {
    const [created] = await db.insert(Person).values(payload).returning();
    return created;
  }

  static async fetchByTenant(db: DrizzleD1Database, tenant_id: string) {
    return db
      .select()
      .from(Person)
      .where(eq(Person.tenant_id, tenant_id))
      .orderBy(desc(Person.created_at));
  }

  static async fetchById(db: DrizzleD1Database, id: string) {
    const [row] = await db.select().from(Person).where(eq(Person.id, id));
    return row;
  }

  static async fetchByExternalId(
    db: DrizzleD1Database,
    tenant_id: string,
    external_id: string,
  ) {
    const [row] = await db
      .select()
      .from(Person)
      .where(
        and(eq(Person.tenant_id, tenant_id), eq(Person.external_id, external_id)),
      );
    return row;
  }

  static async update(
    db: DrizzleD1Database,
    id: string,
    update: Partial<typeof Person.$inferInsert>,
  ) {
    const [updated] = await db
      .update(Person)
      .set({ ...update, updated_at: new Date().toISOString() })
      .where(eq(Person.id, id))
      .returning();
    return updated;
  }

  static async remove(db: DrizzleD1Database, id: string) {
    const [deleted] = await db.delete(Person).where(eq(Person.id, id)).returning();
    return deleted;
  }
}

export { PersonRepository };
