ALTER TABLE `game_submissions` ADD `official_crawl_permission` integer NOT NULL DEFAULT false;
ALTER TABLE `game_submissions` ADD `promotional_capture_permission` integer NOT NULL DEFAULT false;
ALTER TABLE `game_submissions` ADD `editorial_use_permission` integer NOT NULL DEFAULT false;
ALTER TABLE `game_submissions` ADD `permissions_contact_email` text;
