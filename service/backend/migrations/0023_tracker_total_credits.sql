ALTER TABLE `trackers` ADD COLUMN `total_usage_credits` real;
--> statement-breakpoint
ALTER TABLE `tracker_snapshots` ADD COLUMN `total_usage_credits` real;
