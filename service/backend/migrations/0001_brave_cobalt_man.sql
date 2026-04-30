PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_businesses` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`logo` text NOT NULL,
	`google_review_url` text NOT NULL,
	`email` text NOT NULL,
	`branches` text DEFAULT '[]' NOT NULL,
	`timestamp` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_businesses`("id", "slug", "name", "logo", "google_review_url", "email", "branches", "timestamp") SELECT "id", "slug", "name", "logo", "google_review_url", "email", "branches", "timestamp" FROM `businesses`;--> statement-breakpoint
DROP TABLE `businesses`;--> statement-breakpoint
ALTER TABLE `__new_businesses` RENAME TO `businesses`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint