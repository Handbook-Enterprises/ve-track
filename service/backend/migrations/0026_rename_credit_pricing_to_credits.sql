DROP INDEX IF EXISTS `idx_credit_pricing_lookup`;
--> statement-breakpoint
ALTER TABLE `credit_pricing` RENAME TO `credits`;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_credits_lookup` ON `credits` (`tenant_id`,`app`,`action`,`effective_from`);
