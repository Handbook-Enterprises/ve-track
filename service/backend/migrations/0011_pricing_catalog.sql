ALTER TABLE `usage_events` ADD COLUMN `cached_input_tokens` integer;
--> statement-breakpoint
ALTER TABLE `usage_events` ADD COLUMN `cache_write_tokens` integer;
--> statement-breakpoint
ALTER TABLE `usage_events` ADD COLUMN `reasoning_tokens` integer;
--> statement-breakpoint
ALTER TABLE `usage_events` ADD COLUMN `cost_source` text;
--> statement-breakpoint
ALTER TABLE `usage_events` ADD COLUMN `cost_confidence` text;
--> statement-breakpoint
CREATE TABLE `model_pricing` (
	`provider` text NOT NULL,
	`model_id` text NOT NULL,
	`input_per_m` real DEFAULT 0 NOT NULL,
	`output_per_m` real DEFAULT 0 NOT NULL,
	`cache_read_per_m` real,
	`cache_write_per_m` real,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`provider`, `model_id`)
);
