ALTER TABLE `trackers` ADD COLUMN `total_usage_usd` real;
--> statement-breakpoint
ALTER TABLE `tracker_snapshots` ADD COLUMN `total_usage_usd` real;
