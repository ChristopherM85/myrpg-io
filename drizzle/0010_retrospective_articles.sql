ALTER TABLE `articles` ADD `source_date` text;
ALTER TABLE `articles` ADD `gamer_takeaway` text;
ALTER TABLE `articles` ADD `retrospective` integer NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS `idx_articles_retrospective_status_published_at` ON `articles` (`retrospective`, `status`, `published_at`);
PRAGMA optimize;
