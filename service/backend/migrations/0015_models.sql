CREATE TABLE `models` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`provider` text NOT NULL,
	`model_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_models_tenant` ON `models` (`tenant_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_models_tenant_provider_model` ON `models` (`tenant_id`,`provider`,`model_id`);
