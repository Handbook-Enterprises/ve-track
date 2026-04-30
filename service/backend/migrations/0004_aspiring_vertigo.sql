CREATE TABLE `branches` (
	`id` text PRIMARY KEY NOT NULL,
	`business_id` text NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`google_review_url` text NOT NULL,
	`timestamp` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `businesses` DROP COLUMN `branches`;