ALTER TABLE `usage_events` ADD COLUMN `credits_charged` real;
--> statement-breakpoint
ALTER TABLE `usage_events` ADD COLUMN `credit_price_usd_at_event` real;
--> statement-breakpoint
ALTER TABLE `usage_events` ADD COLUMN `correlation_id` text;
--> statement-breakpoint
CREATE INDEX `idx_usage_tenant_correlation` ON `usage_events` (`tenant_id`,`correlation_id`,`timestamp`);
--> statement-breakpoint
CREATE INDEX `idx_usage_tenant_app_action` ON `usage_events` (`tenant_id`,`app`,`action`,`timestamp`);
--> statement-breakpoint
ALTER TABLE `tenants` ADD COLUMN `credit_price_usd` real DEFAULT 0.01 NOT NULL;
--> statement-breakpoint
CREATE TABLE `credit_pricing` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`app` text NOT NULL,
	`action` text NOT NULL,
	`credits_per_call` real NOT NULL,
	`effective_from` integer NOT NULL,
	`effective_to` integer,
	`source` text DEFAULT 'imported' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_credit_pricing_lookup` ON `credit_pricing` (`tenant_id`,`app`,`action`,`effective_from`);
