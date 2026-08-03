ALTER TABLE `games` ADD `multiplayer_type` text;
ALTER TABLE `games` ADD `world_model` text;
ALTER TABLE `games` ADD `lifecycle_status` text;
CREATE TABLE IF NOT EXISTS `source_watchlist` (
  `id` text PRIMARY KEY NOT NULL,
  `source_id` text NOT NULL UNIQUE,
  `check_mode` text NOT NULL DEFAULT 'owner_triggered',
  `status` text NOT NULL DEFAULT 'ready',
  `last_requested_at` text,
  `last_checked_at` text,
  `note` text,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL
);
CREATE INDEX IF NOT EXISTS `idx_source_watchlist_status` ON `source_watchlist` (`status`);
