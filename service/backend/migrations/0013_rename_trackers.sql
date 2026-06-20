ALTER TABLE `cost_trackers` RENAME TO `trackers`;
--> statement-breakpoint
ALTER TABLE `trackers` ADD COLUMN `account_ref` text;
--> statement-breakpoint
DROP INDEX IF EXISTS `idx_cost_trackers_tenant`;
--> statement-breakpoint
DROP INDEX IF EXISTS `idx_cost_trackers_tenant_dedup`;
--> statement-breakpoint
CREATE INDEX `idx_trackers_tenant` ON `trackers` (`tenant_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_trackers_tenant_dedup` ON `trackers` (`tenant_id`,`dedup_hash`);
