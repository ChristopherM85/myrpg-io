CREATE TABLE `game_timeline_events` (
	`id` text PRIMARY KEY NOT NULL,
	`game_id` text NOT NULL,
	`title` text NOT NULL,
	`explanation` text NOT NULL,
	`event_type` text NOT NULL,
	`event_date` text NOT NULL,
	`date_confidence` text DEFAULT 'confirmed' NOT NULL,
	`source_url` text NOT NULL,
	`normalized_source_url` text NOT NULL,
	`citation` text NOT NULL,
	`fact_checked_at` text NOT NULL,
	`confidence` text DEFAULT 'high' NOT NULL,
	`review_status` text DEFAULT 'draft' NOT NULL,
	`published` integer DEFAULT false NOT NULL,
	`fingerprint` text NOT NULL,
	`article_id` text,
	`calendar_item_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
CREATE UNIQUE INDEX `game_timeline_events_fingerprint_unique` ON `game_timeline_events` (`fingerprint`);
CREATE INDEX `idx_game_timeline_game_published_date` ON `game_timeline_events` (`game_id`,`published`,`event_date`);
CREATE TABLE `public_corrections` (
	`id` text PRIMARY KEY NOT NULL,
	`correction_type` text NOT NULL,
	`target_type` text NOT NULL,
	`target_id` text NOT NULL,
	`summary` text NOT NULL,
	`reason` text NOT NULL,
	`source_url` text NOT NULL,
	`review_status` text DEFAULT 'draft' NOT NULL,
	`published` integer DEFAULT false NOT NULL,
	`published_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
CREATE INDEX `idx_public_corrections_published_at` ON `public_corrections` (`published`,`published_at`);
