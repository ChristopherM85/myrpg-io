ALTER TABLE `sources` ADD `source_role` text NOT NULL DEFAULT 'primary';
ALTER TABLE `source_watchlist` ADD `feed_tier` text NOT NULL DEFAULT 'primary';
