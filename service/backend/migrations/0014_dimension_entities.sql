CREATE TABLE `apps` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_apps_tenant` ON `apps` (`tenant_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_apps_tenant_slug` ON `apps` (`tenant_id`,`slug`);
--> statement-breakpoint
CREATE TABLE `actions` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`app_slug` text,
	`description` text,
	`credits_per_call` real,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_actions_tenant` ON `actions` (`tenant_id`);
--> statement-breakpoint
CREATE INDEX `idx_actions_tenant_app` ON `actions` (`tenant_id`,`app_slug`);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_actions_tenant_app_slug` ON `actions` (`tenant_id`,`app_slug`,`slug`);
--> statement-breakpoint
CREATE TABLE `people` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`external_id` text,
	`name` text,
	`email` text,
	`avatar_url` text,
	`organization_external_id` text,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_people_tenant` ON `people` (`tenant_id`);
--> statement-breakpoint
CREATE INDEX `idx_people_tenant_external` ON `people` (`tenant_id`,`external_id`);
--> statement-breakpoint
CREATE TABLE `organizations` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`external_id` text,
	`name` text,
	`domain` text,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_organizations_tenant` ON `organizations` (`tenant_id`);
--> statement-breakpoint
CREATE INDEX `idx_organizations_tenant_external` ON `organizations` (`tenant_id`,`external_id`);
