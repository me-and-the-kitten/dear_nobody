ALTER TABLE `exchanges` ADD `created_at` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `exchanges` ADD `network` text DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE INDEX `exchange_owner_time` ON `exchanges` (`owner`,`created_at`);--> statement-breakpoint
CREATE INDEX `exchange_network_time` ON `exchanges` (`network`,`created_at`);