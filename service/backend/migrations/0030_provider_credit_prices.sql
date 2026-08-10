-- Per-provider credit rates.
--
-- `tenant_settings.credit_price_usd` (migration 0027) is a single rate for
-- every provider. That cannot be correct: an Ahrefs API unit, a Local Falcon
-- map pin and a Rapid URL Indexer submission differ by ~2 orders of magnitude
-- (~$0.0006 / ~$0.003 / ~$0.045). One number priced all of them wrongly, so it
-- was left null and every credit-billed call aggregated as $0 — which reads as
-- free rather than as unpriced.
--
-- That column stays as the fallback for providers with no row here, so nothing
-- changes for tenants that never configure one.

CREATE TABLE IF NOT EXISTS `provider_credit_prices` (
  `id` text PRIMARY KEY NOT NULL,
  `tenant_id` text NOT NULL,
  `provider` text NOT NULL,
  `credit_price_usd` real NOT NULL,
  `note` text,
  `updated_at` text DEFAULT (current_timestamp) NOT NULL,
  `created_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `idx_provider_credit_prices_tenant_provider`
  ON `provider_credit_prices` (`tenant_id`, `provider`);
