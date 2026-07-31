import { eq, and, desc } from "drizzle-orm";
import { DrizzleD1Database } from "drizzle-orm/d1";
import IdentityKey from "../models/identity-key.model";

type IdentityKeyRow = typeof IdentityKey.$inferSelect;

const PUBLIC_COLUMNS = {
  id: IdentityKey.id,
  tenant_id: IdentityKey.tenant_id,
  provider: IdentityKey.provider,
  label: IdentityKey.label,
  key_last4: IdentityKey.key_last4,
  account_ref: IdentityKey.account_ref,
  status: IdentityKey.status,
  last_error: IdentityKey.last_error,
  created_at: IdentityKey.created_at,
  updated_at: IdentityKey.updated_at,
};

class IdentityKeyRepository {
  static async create(
    db: DrizzleD1Database,
    payload: typeof IdentityKey.$inferInsert,
  ) {
    const [created] = await db.insert(IdentityKey).values(payload).returning();
    return created;
  }

  static async fetchByTenant(db: DrizzleD1Database, tenant_id: string) {
    return db
      .select(PUBLIC_COLUMNS)
      .from(IdentityKey)
      .where(eq(IdentityKey.tenant_id, tenant_id))
      .orderBy(desc(IdentityKey.created_at));
  }

  static async fetchById(db: DrizzleD1Database, id: string) {
    const [row] = await db
      .select()
      .from(IdentityKey)
      .where(eq(IdentityKey.id, id));
    return row as IdentityKeyRow | undefined;
  }

  static async fetchByDedup(
    db: DrizzleD1Database,
    tenant_id: string,
    dedup_hash: string,
  ) {
    const [row] = await db
      .select(PUBLIC_COLUMNS)
      .from(IdentityKey)
      .where(
        and(
          eq(IdentityKey.tenant_id, tenant_id),
          eq(IdentityKey.dedup_hash, dedup_hash),
        ),
      );
    return row;
  }

  static async fetchFullActiveByTenant(
    db: DrizzleD1Database,
    tenant_id: string,
  ) {
    return (await db
      .select()
      .from(IdentityKey)
      .where(
        and(
          eq(IdentityKey.tenant_id, tenant_id),
          eq(IdentityKey.status, "active"),
        ),
      )
      .orderBy(desc(IdentityKey.created_at))) as IdentityKeyRow[];
  }

  static async update(
    db: DrizzleD1Database,
    id: string,
    update: Partial<typeof IdentityKey.$inferInsert>,
  ) {
    const [updated] = await db
      .update(IdentityKey)
      .set({ ...update, updated_at: new Date().toISOString() })
      .where(eq(IdentityKey.id, id))
      .returning();
    return updated;
  }

  static async remove(db: DrizzleD1Database, id: string) {
    const [deleted] = await db
      .delete(IdentityKey)
      .where(eq(IdentityKey.id, id))
      .returning(PUBLIC_COLUMNS);
    return deleted;
  }
}

export { IdentityKeyRepository };
