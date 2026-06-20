CREATE TABLE `tracker_costs` (
	`id` text PRIMARY KEY NOT NULL,
	`tracker_id` text NOT NULL,
	`tenant_id` text NOT NULL,
	`day` text NOT NULL,
	`ts` integer NOT NULL,
	`cost_usd` real DEFAULT 0 NOT NULL,
	`requests` integer,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_tracker_costs_tracker_ts` ON `tracker_costs` (`tracker_id`,`ts`);
--> statement-breakpoint
CREATE INDEX `idx_tracker_costs_tenant` ON `tracker_costs` (`tenant_id`);
