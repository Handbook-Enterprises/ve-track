CREATE TABLE `tenants` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`clerk_org_id` text,
	`plan` text DEFAULT 'free' NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tenants_name_unique` ON `tenants` (`name`);
--> statement-breakpoint
CREATE TABLE `api_keys` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`name` text NOT NULL,
	`prefix` text NOT NULL,
	`hashed_key` text NOT NULL,
	`revoked_at` integer,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_api_keys_hashed_key` ON `api_keys` (`hashed_key`);
--> statement-breakpoint
CREATE INDEX `idx_api_keys_tenant` ON `api_keys` (`tenant_id`);
--> statement-breakpoint
CREATE TABLE `usage_events` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`timestamp` integer NOT NULL,
	`app` text NOT NULL,
	`clerk_user_id` text,
	`clerk_org_id` text,
	`provider` text NOT NULL,
	`model` text,
	`prompt_tokens` integer,
	`completion_tokens` integer,
	`latency_ms` integer,
	`cost_usd` real,
	`status_code` integer
);
--> statement-breakpoint
CREATE INDEX `idx_usage_tenant_time` ON `usage_events` (`tenant_id`,`timestamp`);
--> statement-breakpoint
CREATE INDEX `idx_usage_tenant_app` ON `usage_events` (`tenant_id`,`app`,`timestamp`);
--> statement-breakpoint
CREATE INDEX `idx_usage_tenant_org` ON `usage_events` (`tenant_id`,`clerk_org_id`,`timestamp`);
--> statement-breakpoint
CREATE INDEX `idx_usage_tenant_user` ON `usage_events` (`tenant_id`,`clerk_user_id`,`timestamp`);
--> statement-breakpoint
CREATE INDEX `idx_usage_tenant_provider` ON `usage_events` (`tenant_id`,`provider`,`timestamp`);
