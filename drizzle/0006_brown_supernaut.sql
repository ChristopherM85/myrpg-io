CREATE TABLE `calendar_items` (
	`id` text PRIMARY KEY NOT NULL,
	`game_id` text NOT NULL,
	`title` text NOT NULL,
	`date_label` text NOT NULL,
	`date_confidence` text DEFAULT 'unconfirmed' NOT NULL,
	`source_url` text NOT NULL,
	`fact_checked_at` text NOT NULL,
	`review_status` text DEFAULT 'draft' NOT NULL,
	`published` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `games` ADD `release_date_confidence` text DEFAULT 'unconfirmed' NOT NULL;--> statement-breakpoint
ALTER TABLE `games` ADD `directory_summary` text;--> statement-breakpoint
ALTER TABLE `games` ADD `source_confidence` text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE `games` ADD `review_status` text DEFAULT 'draft' NOT NULL;
--> statement-breakpoint
INSERT OR IGNORE INTO `sources` (`id`,`domain`,`label`,`kind`,`approved`,`created_at`,`updated_at`) VALUES
('src-wow','worldofwarcraft.blizzard.com','World of Warcraft official','official',true,'2026-07-31T00:00:00.000Z','2026-07-31T00:00:00.000Z'),
('src-ffxiv','na.finalfantasyxiv.com','FINAL FANTASY XIV official','official',true,'2026-07-31T00:00:00.000Z','2026-07-31T00:00:00.000Z'),
('src-eso','elderscrollsonline.com','The Elder Scrolls Online official','official',true,'2026-07-31T00:00:00.000Z','2026-07-31T00:00:00.000Z'),
('src-gw2','guildwars2.com','Guild Wars 2 official','official',true,'2026-07-31T00:00:00.000Z','2026-07-31T00:00:00.000Z'),
('src-bdo','blackdesertonline.com','Black Desert Online official','official',true,'2026-07-31T00:00:00.000Z','2026-07-31T00:00:00.000Z'),
('src-lostark','playlostark.com','Lost Ark official','official',true,'2026-07-31T00:00:00.000Z','2026-07-31T00:00:00.000Z'),
('src-newworld','playnewworld.com','New World official','official',true,'2026-07-31T00:00:00.000Z','2026-07-31T00:00:00.000Z'),
('src-albion','albiononline.com','Albion Online official','official',true,'2026-07-31T00:00:00.000Z','2026-07-31T00:00:00.000Z'),
('src-runescape','runescape.com','RuneScape official','official',true,'2026-07-31T00:00:00.000Z','2026-07-31T00:00:00.000Z'),
('src-aqw','aq.com','AdventureQuest Worlds official','official',true,'2026-07-31T00:00:00.000Z','2026-07-31T00:00:00.000Z'),
('src-paxdei','playpaxdei.com','Pax Dei official','official',true,'2026-07-31T00:00:00.000Z','2026-07-31T00:00:00.000Z'),
('src-corepunk','corepunk.com','Corepunk official','official',true,'2026-07-31T00:00:00.000Z','2026-07-31T00:00:00.000Z'),
('src-ashes','ashesofcreation.com','Ashes of Creation official','official',true,'2026-07-31T00:00:00.000Z','2026-07-31T00:00:00.000Z'),
('src-chrono','chrono-odyssey.com','Chrono Odyssey official','official',true,'2026-07-31T00:00:00.000Z','2026-07-31T00:00:00.000Z'),
('src-archeage','archeagechronicles.com','ArcheAge Chronicles official','official',true,'2026-07-31T00:00:00.000Z','2026-07-31T00:00:00.000Z');
--> statement-breakpoint
INSERT OR IGNORE INTO `games` (`id`,`slug`,`name`,`status`,`platforms`,`business_model`,`combat`,`setting`,`focus`,`activity`,`time_commitment`,`release_date`,`release_date_confidence`,`official_url`,`source_url`,`fact_checked_at`,`directory_summary`,`source_confidence`,`review_status`,`published`,`created_at`,`updated_at`) VALUES
('game-wow','world-of-warcraft','World of Warcraft','live','PC','subscription','tab-target','fantasy','balanced','solo, guild/social','regular, hardcore','2004-11-23','confirmed','https://worldofwarcraft.blizzard.com/en-us/','https://worldofwarcraft.blizzard.com/en-us/','2026-07-31T00:00:00.000Z','A long-running fantasy MMORPG with official subscription access and both PvE and PvP play.','high','draft',false,'2026-07-31T00:00:00.000Z','2026-07-31T00:00:00.000Z'),
('game-ffxiv','final-fantasy-xiv','FINAL FANTASY XIV Online','live','PC, PlayStation, Xbox','subscription','tab-target','fantasy','balanced','solo, duo, guild/social','casual, regular, hardcore','2013-08-27','confirmed','https://na.finalfantasyxiv.com/','https://na.finalfantasyxiv.com/product/index.html','2026-07-31T00:00:00.000Z','A story-led fantasy MMORPG with an official free trial and subscription product options.','high','draft',false,'2026-07-31T00:00:00.000Z','2026-07-31T00:00:00.000Z'),
('game-eso','elder-scrolls-online','The Elder Scrolls Online','live','PC, Mac, PlayStation, Xbox','buy-to-play','action','fantasy','balanced','solo, duo, guild/social','casual, regular','2014-04-04','confirmed','https://www.elderscrollsonline.com/','https://www.elderscrollsonline.com/','2026-07-31T00:00:00.000Z','An online RPG set in the Elder Scrolls universe with official PC and console editions.','high','draft',false,'2026-07-31T00:00:00.000Z','2026-07-31T00:00:00.000Z'),
('game-gw2','guild-wars-2','Guild Wars 2','live','PC','buy-to-play','action','fantasy','balanced','solo, duo, guild/social','casual, regular','2012-08-28','confirmed','https://www.guildwars2.com/','https://www.guildwars2.com/','2026-07-31T00:00:00.000Z','A fantasy MMORPG with a free account option and expansion purchases; no monthly subscription is required.','high','draft',false,'2026-07-31T00:00:00.000Z','2026-07-31T00:00:00.000Z'),
('game-bdo','black-desert-online','Black Desert Online','live','PC','buy-to-play','action','fantasy','balanced','solo, guild/social','regular, hardcore','2016-03-03','confirmed','https://www.blackdesertonline.com/','https://www.blackdesertonline.com/','2026-07-31T00:00:00.000Z','A fantasy action MMORPG with a PC edition from the official Black Desert Online site.','high','draft',false,'2026-07-31T00:00:00.000Z','2026-07-31T00:00:00.000Z'),
('game-lostark','lost-ark','Lost Ark','live','PC','free-to-play','action','fantasy','balanced','solo, duo, guild/social','regular, hardcore','2022-02-11','confirmed','https://www.playlostark.com/','https://www.playlostark.com/','2026-07-31T00:00:00.000Z','A free-to-play fantasy action MMORPG with official PC support.','high','draft',false,'2026-07-31T00:00:00.000Z','2026-07-31T00:00:00.000Z'),
('game-new-world','new-world-aeternum','New World: Aeternum','live','PC, PlayStation, Xbox','buy-to-play','action','fantasy','balanced','solo, duo, guild/social','casual, regular','2024-10-15','confirmed','https://www.playnewworld.com/','https://www.playnewworld.com/','2026-07-31T00:00:00.000Z','A cross-platform action MMORPG with official PC, PlayStation, and Xbox editions.','high','draft',false,'2026-07-31T00:00:00.000Z','2026-07-31T00:00:00.000Z'),
('game-albion','albion-online','Albion Online','live','PC, Mac, Linux, iOS, Android','free-to-play','action','fantasy','pvp','solo, duo, guild/social','regular, hardcore','2017-07-17','confirmed','https://albiononline.com/','https://albiononline.com/','2026-07-31T00:00:00.000Z','A cross-platform fantasy MMORPG with official desktop and mobile clients.','high','draft',false,'2026-07-31T00:00:00.000Z','2026-07-31T00:00:00.000Z'),
('game-runescape','runescape','RuneScape','live','PC, Mac, iOS, Android','free-to-play','tab-target','fantasy','balanced','solo, duo, guild/social','casual, regular','2001-01-04','confirmed','https://www.runescape.com/','https://www.runescape.com/','2026-07-31T00:00:00.000Z','A fantasy online role-playing game with official desktop and mobile access.','high','draft',false,'2026-07-31T00:00:00.000Z','2026-07-31T00:00:00.000Z'),
('game-aqw','adventurequest-worlds','AdventureQuest Worlds','live','browser, PC, Mac, iOS, Android','free-to-play','action','fantasy','balanced','solo, duo, guild/social','casual, regular','2008-10-10','confirmed','https://www.aq.com/','https://www.aq.com/','2026-07-31T00:00:00.000Z','A browser-based fantasy MMORPG with official desktop and mobile options.','high','draft',false,'2026-07-31T00:00:00.000Z','2026-07-31T00:00:00.000Z'),
('game-paxdei','pax-dei','Pax Dei','early-access','PC','buy-to-play','action','fantasy','balanced','solo, guild/social','regular, hardcore','unconfirmed','unconfirmed','https://playpaxdei.com/','https://playpaxdei.com/','2026-07-31T00:00:00.000Z','A social sandbox MMORPG in early access, subject to continued development updates.','high','draft',false,'2026-07-31T00:00:00.000Z','2026-07-31T00:00:00.000Z'),
('game-corepunk','corepunk','Corepunk','early-access','PC','buy-to-play','action','fantasy','balanced','solo, duo, guild/social','regular, hardcore','unconfirmed','unconfirmed','https://corepunk.com/','https://corepunk.com/','2026-07-31T00:00:00.000Z','An isometric MMORPG in early access with official development updates.','high','draft',false,'2026-07-31T00:00:00.000Z','2026-07-31T00:00:00.000Z'),
('game-ashes','ashes-of-creation','Ashes of Creation','early-access','PC','subscription','tab-target','fantasy','balanced','guild/social','hardcore','2025-12-11','confirmed','https://ashesofcreation.com/','https://support.ashesofcreation.com/hc/en-us/articles/360016315013-What-are-the-Alpha-Beta-Release-dates','2026-07-31T00:00:00.000Z','An MMORPG currently in official early access; the final launch date remains unconfirmed.','high','draft',false,'2026-07-31T00:00:00.000Z','2026-07-31T00:00:00.000Z'),
('game-chrono','chrono-odyssey','Chrono Odyssey','announced','PC, PlayStation, Xbox','unconfirmed','action','fantasy','balanced','solo, duo, guild/social','regular, hardcore','unconfirmed','unconfirmed','https://chrono-odyssey.com/','https://chrono-odyssey.com/','2026-07-31T00:00:00.000Z','An announced action MMORPG; platform and launch details remain subject to official confirmation.','pending','draft',false,'2026-07-31T00:00:00.000Z','2026-07-31T00:00:00.000Z'),
('game-archeage','archeage-chronicles','ArcheAge Chronicles','announced','PC, PlayStation, Xbox','unconfirmed','action','fantasy','balanced','solo, duo, guild/social','regular','unconfirmed','unconfirmed','https://archeagechronicles.com/','https://archeagechronicles.com/','2026-07-31T00:00:00.000Z','An announced online action RPG with official information still developing.','pending','draft',false,'2026-07-31T00:00:00.000Z','2026-07-31T00:00:00.000Z');
--> statement-breakpoint
INSERT OR IGNORE INTO `calendar_items` (`id`,`game_id`,`title`,`date_label`,`date_confidence`,`source_url`,`fact_checked_at`,`review_status`,`published`,`created_at`,`updated_at`) VALUES
('cal-ashes-ea','game-ashes','Ashes of Creation Early Access','December 11, 2025','confirmed','https://support.ashesofcreation.com/hc/en-us/articles/360016315013-What-are-the-Alpha-Beta-Release-dates','2026-07-31T00:00:00.000Z','draft',false,'2026-07-31T00:00:00.000Z','2026-07-31T00:00:00.000Z'),
('cal-paxdei','game-paxdei','Pax Dei full release','Unconfirmed','unconfirmed','https://playpaxdei.com/','2026-07-31T00:00:00.000Z','draft',false,'2026-07-31T00:00:00.000Z','2026-07-31T00:00:00.000Z'),
('cal-corepunk','game-corepunk','Corepunk full release','Unconfirmed','unconfirmed','https://corepunk.com/','2026-07-31T00:00:00.000Z','draft',false,'2026-07-31T00:00:00.000Z','2026-07-31T00:00:00.000Z'),
('cal-chrono','game-chrono','Chrono Odyssey release','Unconfirmed','unconfirmed','https://chrono-odyssey.com/','2026-07-31T00:00:00.000Z','draft',false,'2026-07-31T00:00:00.000Z','2026-07-31T00:00:00.000Z'),
('cal-archeage','game-archeage','ArcheAge Chronicles release','Unconfirmed','unconfirmed','https://archeagechronicles.com/','2026-07-31T00:00:00.000Z','draft',false,'2026-07-31T00:00:00.000Z','2026-07-31T00:00:00.000Z'),
('cal-newworld','game-new-world','New World: Aeternum launch','October 15, 2024','confirmed','https://www.playnewworld.com/','2026-07-31T00:00:00.000Z','draft',false,'2026-07-31T00:00:00.000Z','2026-07-31T00:00:00.000Z'),
('cal-lostark','game-lostark','Lost Ark western launch','February 11, 2022','confirmed','https://www.playlostark.com/','2026-07-31T00:00:00.000Z','draft',false,'2026-07-31T00:00:00.000Z','2026-07-31T00:00:00.000Z'),
('cal-ffxiv','game-ffxiv','FINAL FANTASY XIV: A Realm Reborn launch','August 27, 2013','confirmed','https://na.finalfantasyxiv.com/product/index.html','2026-07-31T00:00:00.000Z','draft',false,'2026-07-31T00:00:00.000Z','2026-07-31T00:00:00.000Z'),
('cal-eso','game-eso','The Elder Scrolls Online launch','April 4, 2014','confirmed','https://www.elderscrollsonline.com/','2026-07-31T00:00:00.000Z','draft',false,'2026-07-31T00:00:00.000Z','2026-07-31T00:00:00.000Z'),
('cal-gw2','game-gw2','Guild Wars 2 launch','August 28, 2012','confirmed','https://www.guildwars2.com/','2026-07-31T00:00:00.000Z','draft',false,'2026-07-31T00:00:00.000Z','2026-07-31T00:00:00.000Z');
