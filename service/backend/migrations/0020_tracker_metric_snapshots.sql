ALTER TABLE `trackers` ADD COLUMN `monthly_spend` real;
--> statement-breakpoint
ALTER TABLE `trackers` ADD COLUMN `weekly_spend` real;
--> statement-breakpoint
ALTER TABLE `trackers` ADD COLUMN `balance_usd` real;
--> statement-breakpoint
ALTER TABLE `trackers` ADD COLUMN `credits_remaining` real;
--> statement-breakpoint
ALTER TABLE `trackers` ADD COLUMN `request_count` integer;
--> statement-breakpoint
CREATE TABLE `tracker_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`tracker_id` text NOT NULL,
	`tenant_id` text NOT NULL,
	`day` text NOT NULL,
	`ts` integer NOT NULL,
	`monthly_spend` real,
	`weekly_spend` real,
	`balance_usd` real,
	`credits_remaining` real,
	`request_count` integer,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_tracker_snapshots_tracker_ts` ON `tracker_snapshots` (`tracker_id`,`ts`);
--> statement-breakpoint
CREATE INDEX `idx_tracker_snapshots_tenant` ON `tracker_snapshots` (`tenant_id`);
