ALTER TABLE `tenants` ADD COLUMN `clerk_user_id` text;
--> statement-breakpoint
CREATE INDEX `idx_tenants_clerk_org_id` ON `tenants` (`clerk_org_id`);
--> statement-breakpoint
CREATE INDEX `idx_tenants_clerk_user_id` ON `tenants` (`clerk_user_id`);
