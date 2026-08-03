CREATE TABLE IF NOT EXISTS `source_evidence_packets` (
  `id` text PRIMARY KEY NOT NULL,
  `source_id` text NOT NULL,
  `game_id` text NOT NULL,
  `normalized_url` text NOT NULL UNIQUE,
  `source_date` text,
  `evidence_json` text NOT NULL,
  `confidence` text NOT NULL,
  `status` text NOT NULL DEFAULT 'private_review',
  `checked_at` text NOT NULL,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL
);
CREATE INDEX IF NOT EXISTS `idx_source_evidence_packets_status` ON `source_evidence_packets` (`status`);
