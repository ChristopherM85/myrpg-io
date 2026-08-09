CREATE TABLE IF NOT EXISTS `submission_captures` (
  `id` text PRIMARY KEY NOT NULL,
  `submission_id` text NOT NULL,
  `target_url` text NOT NULL,
  `normalized_url` text NOT NULL,
  `robots_url` text NOT NULL,
  `robots_status` text NOT NULL,
  `page_title` text,
  `image_url` text,
  `r2_key` text,
  `content_type` text,
  `bytes` integer,
  `status` text DEFAULT 'private_review' NOT NULL,
  `error` text,
  `permissions_json` text NOT NULL,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL
);
CREATE INDEX IF NOT EXISTS `idx_submission_captures_submission_created` ON `submission_captures` (`submission_id`,`created_at`);
CREATE INDEX IF NOT EXISTS `idx_submission_captures_normalized` ON `submission_captures` (`normalized_url`);
