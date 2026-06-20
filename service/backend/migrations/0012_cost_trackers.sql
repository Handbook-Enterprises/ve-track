CREATE TABLE `cost_trackers` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`provider` text NOT NULL,
	`label` text NOT NULL,
	`app` text NOT NULL,
	`key_ciphertext` text NOT NULL,
	`key_iv` text NOT NULL,
	`wrapped_dek` text NOT NULL,
	`dek_iv` text NOT NULL,
	`key_last4` text NOT NULL,
	`dedup_hash` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`last_error` text,
	`last_synced_at` integer,
	`pulled_cost_usd` real DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_cost_trackers_tenant` ON `cost_trackers` (`tenant_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_cost_trackers_tenant_dedup` ON `cost_trackers` (`tenant_id`,`dedup_hash`);
