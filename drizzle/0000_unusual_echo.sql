CREATE TABLE `exchanges` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`slot` integer NOT NULL,
	`body` text NOT NULL,
	`envelope` integer NOT NULL,
	`paper` integer NOT NULL,
	`applied` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `letters` (
	`slot` integer PRIMARY KEY NOT NULL,
	`body` text NOT NULL,
	`envelope` integer NOT NULL,
	`paper` integer NOT NULL,
	`owner` text NOT NULL
);
