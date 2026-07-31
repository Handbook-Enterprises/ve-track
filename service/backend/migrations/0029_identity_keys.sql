CREATE TABLE `identity_keys` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`provider` text DEFAULT 'clerk' NOT NULL,
	`label` text NOT NULL,
	`key_ciphertext` text NOT NULL,
	`key_iv` text NOT NULL,
	`wrapped_dek` text NOT NULL,
	`dek_iv` text NOT NULL,
	`key_last4` text NOT NULL,
	`dedup_hash` text NOT NULL,
	`account_ref` text,
	`status` text DEFAULT 'active' NOT NULL,
	`last_error` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_identity_keys_tenant` ON `identity_keys` (`tenant_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_identity_keys_tenant_dedup` ON `identity_keys` (`tenant_id`,`dedup_hash`);
