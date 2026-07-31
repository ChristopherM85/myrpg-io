CREATE TABLE `media_assets` (
	`id` text PRIMARY KEY NOT NULL,
	`article_id` text,
	`game_id` text,
	`asset_url` text,
	`r2_key` text,
	`source_url` text,
	`source_type` text NOT NULL,
	`credit` text,
	`alt_text` text NOT NULL,
	`caption` text,
	`width` integer,
	`height` integer,
	`content_hash` text,
	`placement` text DEFAULT 'lead' NOT NULL,
	`status` text DEFAULT 'pending_review' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
