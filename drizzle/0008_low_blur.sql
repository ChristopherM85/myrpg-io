CREATE TABLE `editorial_plans` (
	`id` text PRIMARY KEY NOT NULL,
	`record_id` text,
	`title` text NOT NULL,
	`proposed_date` text NOT NULL,
	`content_type` text NOT NULL,
	`related_game` text,
	`source_status` text DEFAULT 'pending' NOT NULL,
	`review_status` text DEFAULT 'planned' NOT NULL,
	`media_status` text DEFAULT 'fallback' NOT NULL,
	`blocker` text,
	`status` text DEFAULT 'planned' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `search_engine_statuses` (
	`id` text PRIMARY KEY NOT NULL,
	`engine` text NOT NULL,
	`property_url` text DEFAULT 'https://myrpg.io/' NOT NULL,
	`verification_status` text DEFAULT 'not_started' NOT NULL,
	`sitemap_status` text DEFAULT 'not_submitted' NOT NULL,
	`verified_at` text,
	`submitted_at` text,
	`notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `search_engine_statuses_engine_unique` ON `search_engine_statuses` (`engine`);--> statement-breakpoint
CREATE INDEX `idx_editorial_plans_proposed_date_status` ON `editorial_plans` (`proposed_date`,`status`);--> statement-breakpoint
PRAGMA optimize;
