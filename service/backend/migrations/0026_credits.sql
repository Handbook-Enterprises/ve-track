CREATE TABLE `credits` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`timestamp` integer NOT NULL,
	`app` text NOT NULL,
	`action` text,
	`clerk_org_id` text,
	`clerk_user_id` text,
	`credits` real NOT NULL,
	`credit_price_usd` real,
	`cost_usd` real,
	`correlation_id` text,
	`source` text DEFAULT 'sdk' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_credits_tenant_time` ON `credits` (`tenant_id`,`timestamp`);
--> statement-breakpoint
CREATE INDEX `idx_credits_tenant_app_action` ON `credits` (`tenant_id`,`app`,`action`,`timestamp`);
--> statement-breakpoint
CREATE INDEX `idx_credits_tenant_org` ON `credits` (`tenant_id`,`clerk_org_id`,`timestamp`);
--> statement-breakpoint
CREATE INDEX `idx_credits_tenant_correlation` ON `credits` (`tenant_id`,`correlation_id`,`timestamp`);
