CREATE TABLE IF NOT EXISTS `source_verification_packets` (
  `id` text PRIMARY KEY NOT NULL,
  `lead_run_id` text NOT NULL UNIQUE,
  `source_id` text NOT NULL,
  `normalized_url` text NOT NULL UNIQUE,
  `source_date` text,
  `evidence_json` text NOT NULL,
  `confidence` text NOT NULL,
  `status` text NOT NULL DEFAULT 'private_review',
  `checked_at` text NOT NULL,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL
);
CREATE INDEX IF NOT EXISTS `idx_source_verification_packets_status` ON `source_verification_packets` (`status`);
