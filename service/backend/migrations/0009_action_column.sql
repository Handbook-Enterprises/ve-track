ALTER TABLE `usage_events` ADD COLUMN `action` text;
--> statement-breakpoint
CREATE INDEX `idx_usage_tenant_action` ON `usage_events` (`tenant_id`,`action`,`timestamp`);
