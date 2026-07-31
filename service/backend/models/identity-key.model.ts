import { sqliteTable, text, index, uniqueIndex } from "drizzle-orm/sqlite-core";
import { timestamps } from "../utils";

const IdentityKey = sqliteTable(
  "identity_keys",
  {
    id: text()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    tenant_id: text().notNull(),
    provider: text().notNull().default("clerk"),
    label: text().notNull(),
    key_ciphertext: text().notNull(),
    key_iv: text().notNull(),
    wrapped_dek: text().notNull(),
    dek_iv: text().notNull(),
    key_last4: text().notNull(),
    dedup_hash: text().notNull(),
    account_ref: text(),
    status: text().notNull().default("active"),
    last_error: text(),
    ...timestamps,
  },
  (t) => ({
    tenantIdx: index("idx_identity_keys_tenant").on(t.tenant_id),
    tenantDedupIdx: uniqueIndex("idx_identity_keys_tenant_dedup").on(
      t.tenant_id,
      t.dedup_hash,
    ),
  }),
);

export default IdentityKey;
