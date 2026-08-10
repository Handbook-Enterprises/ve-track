import { sqliteTable, text, real, uniqueIndex } from "drizzle-orm/sqlite-core";
import { timestamps } from "../utils";

/**
 * What one credit is worth, per provider, per tenant.
 *
 * WHY THIS EXISTS SEPARATELY FROM `tenant_settings.credit_price_usd`. That
 * column is a single rate for every provider, which cannot be right: an Ahrefs
 * API unit, a Local Falcon map pin and a Rapid URL Indexer submission differ by
 * roughly two orders of magnitude (~$0.0006 vs ~$0.003 vs ~$0.045). One number
 * priced all of them wrongly, so it was left null and every credit-billed call
 * reported $0 — indistinguishable from free.
 *
 * WHY THIS IS NOT SYNCED FROM A CATALOG, unlike model prices. There is no
 * public feed for what a credit costs, because it depends on the plan the
 * account is on. `model_pricing` can refresh itself from models.dev; this
 * cannot. It is set deliberately, and `note` records where the figure came from
 * so a stale rate is auditable rather than mysterious.
 *
 * `tenant_settings.credit_price_usd` remains the fallback for providers with no
 * row here, so existing behaviour is unchanged where nothing is configured.
 */
const ProviderCreditPrice = sqliteTable(
  "provider_credit_prices",
  {
    id: text()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    tenant_id: text().notNull(),
    /** Provider name as it appears on `usage_events.provider`. */
    provider: text().notNull(),
    /** USD per single credit/unit. */
    credit_price_usd: real().notNull(),
    /** Where the figure came from, e.g. "Standard 2022: $249/mo ÷ 400k units". */
    note: text(),
    ...timestamps,
  },
  (t) => ({
    tenantProviderIdx: uniqueIndex("idx_provider_credit_prices_tenant_provider").on(
      t.tenant_id,
      t.provider,
    ),
  }),
);

export default ProviderCreditPrice;
