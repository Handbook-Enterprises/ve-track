CREATE TABLE `businesses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`logo` text NOT NULL,
	`google_review_url` text NOT NULL,
	`email` text NOT NULL,
	`branches` text DEFAULT '[]' NOT NULL,
	`timestamp` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `businesses_slug_unique` ON `businesses` (`slug`);