ALTER TABLE `games` ADD `official_url` text;--> statement-breakpoint
ALTER TABLE `games` ADD `source_url` text;--> statement-breakpoint
ALTER TABLE `games` ADD `fact_checked_at` text;--> statement-breakpoint
ALTER TABLE `games` ADD `published` integer DEFAULT false NOT NULL;