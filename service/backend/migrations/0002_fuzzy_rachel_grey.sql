CREATE TABLE `feedbacks` (
	`id` text PRIMARY KEY NOT NULL,
	`business_id` text NOT NULL,
	`branch_slug` text,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`message` text NOT NULL,
	`timestamp` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
ALTER TABLE `businesses` ADD `primary_color` text DEFAULT '#000000' NOT NULL;