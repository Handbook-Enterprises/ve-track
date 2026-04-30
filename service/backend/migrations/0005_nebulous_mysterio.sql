ALTER TABLE `businesses` ADD `organization_id` text NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `businesses_organization_id_unique` ON `businesses` (`organization_id`);