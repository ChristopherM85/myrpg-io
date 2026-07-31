CREATE TABLE `disagreements` (
	`id` text PRIMARY KEY NOT NULL,
	`article_id` text,
	`field` text NOT NULL,
	`first_value` text NOT NULL,
	`second_value` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `source_cache` (
	`id` text PRIMARY KEY NOT NULL,
	`normalized_url` text NOT NULL,
	`content_hash` text NOT NULL,
	`source_id` text NOT NULL,
	`last_checked_at` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `source_cache_normalized_url_unique` ON `source_cache` (`normalized_url`);--> statement-breakpoint
ALTER TABLE `articles` ADD `content_fingerprint` text;