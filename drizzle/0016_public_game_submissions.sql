CREATE TABLE IF NOT EXISTS `game_submissions` (
  `id` text PRIMARY KEY NOT NULL,
  `game_name` text NOT NULL,
  `studio_name` text,
  `official_url` text NOT NULL,
  `source_url` text,
  `description` text NOT NULL,
  `coverage_lane` text NOT NULL,
  `lifecycle_status` text,
  `platforms` text,
  `submitter_note` text,
  `image_r2_key` text,
  `image_content_type` text,
  `image_width` integer,
  `image_height` integer,
  `image_alt_text` text,
  `rights_confirmed` integer DEFAULT false NOT NULL,
  `submitter_hash` text NOT NULL,
  `status` text DEFAULT 'new' NOT NULL,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL
);
CREATE INDEX IF NOT EXISTS `idx_game_submissions_status_created` ON `game_submissions` (`status`,`created_at`);
CREATE INDEX IF NOT EXISTS `idx_game_submissions_submitter_created` ON `game_submissions` (`submitter_hash`,`created_at`);
