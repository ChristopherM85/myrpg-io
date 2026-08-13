INSERT OR IGNORE INTO `sources` (`id`,`domain`,`label`,`kind`,`approved`,`source_role`,`created_at`,`updated_at`) VALUES
  ('feed-playstation-blog','blog.playstation.com','PlayStation Blog','official_platform_feed',1,'primary','2026-08-13T00:00:00.000Z','2026-08-13T00:00:00.000Z'),
  ('feed-xbox-wire','news.xbox.com','Xbox Wire','official_platform_feed',1,'primary','2026-08-13T00:00:00.000Z','2026-08-13T00:00:00.000Z'),
  ('feed-gamesindustry','www.gamesindustry.biz','GamesIndustry.biz','editorial_discovery_feed',1,'discovery','2026-08-13T00:00:00.000Z','2026-08-13T00:00:00.000Z'),
  ('feed-pcgamer','www.pcgamer.com','PC Gamer','editorial_discovery_feed',1,'discovery','2026-08-13T00:00:00.000Z','2026-08-13T00:00:00.000Z'),
  ('feed-vgc','www.videogameschronicle.com','Video Games Chronicle','editorial_discovery_feed',1,'discovery','2026-08-13T00:00:00.000Z','2026-08-13T00:00:00.000Z'),
  ('feed-eurogamer','www.eurogamer.net','Eurogamer','editorial_discovery_feed',1,'discovery','2026-08-13T00:00:00.000Z','2026-08-13T00:00:00.000Z'),
  ('feed-rps','www.rockpapershotgun.com','Rock Paper Shotgun','editorial_discovery_feed',1,'discovery','2026-08-13T00:00:00.000Z','2026-08-13T00:00:00.000Z'),
  ('feed-gamesradar','www.gamesradar.com','GamesRadar+','editorial_discovery_feed',1,'discovery','2026-08-13T00:00:00.000Z','2026-08-13T00:00:00.000Z');

INSERT OR IGNORE INTO `source_watchlist` (`id`,`source_id`,`check_mode`,`feed_tier`,`status`,`note`,`created_at`,`updated_at`) VALUES
  ('watch-playstation-blog','feed-playstation-blog','approved_feed','primary','ready','{"feedUrl":"https://blog.playstation.com/feed/","itemLimit":2,"mode":"bounded_daily_rss_atom","privateOnly":true,"autoPublish":false}','2026-08-13T00:00:00.000Z','2026-08-13T00:00:00.000Z'),
  ('watch-xbox-wire','feed-xbox-wire','approved_feed','primary','ready','{"feedUrl":"https://news.xbox.com/en-us/feed/","itemLimit":2,"mode":"bounded_daily_rss_atom","privateOnly":true,"autoPublish":false}','2026-08-13T00:00:00.000Z','2026-08-13T00:00:00.000Z'),
  ('watch-gamesindustry','feed-gamesindustry','approved_feed','discovery','ready','{"feedUrl":"https://www.gamesindustry.biz/feed","itemLimit":1,"mode":"bounded_daily_discovery_rss_atom","privateOnly":true,"autoPublish":false,"noDraft":true}','2026-08-13T00:00:00.000Z','2026-08-13T00:00:00.000Z'),
  ('watch-pcgamer','feed-pcgamer','approved_feed','discovery','ready','{"feedUrl":"https://www.pcgamer.com/rss/","itemLimit":1,"mode":"bounded_daily_discovery_rss_atom","privateOnly":true,"autoPublish":false,"noDraft":true}','2026-08-13T00:00:00.000Z','2026-08-13T00:00:00.000Z'),
  ('watch-vgc','feed-vgc','approved_feed','discovery','ready','{"feedUrl":"https://www.videogameschronicle.com/feed/","itemLimit":1,"mode":"bounded_daily_discovery_rss_atom","privateOnly":true,"autoPublish":false,"noDraft":true}','2026-08-13T00:00:00.000Z','2026-08-13T00:00:00.000Z'),
  ('watch-eurogamer','feed-eurogamer','approved_feed','discovery','ready','{"feedUrl":"https://www.eurogamer.net/feed","itemLimit":1,"mode":"bounded_daily_discovery_rss_atom","privateOnly":true,"autoPublish":false,"noDraft":true}','2026-08-13T00:00:00.000Z','2026-08-13T00:00:00.000Z'),
  ('watch-rps','feed-rps','approved_feed','discovery','hold','{"feedUrl":"https://www.rockpapershotgun.com/feed","itemLimit":1,"mode":"bounded_daily_discovery_rss_atom","privateOnly":true,"autoPublish":false,"noDraft":true,"holdReason":"Curated reserve: four discovery feeds are active."}','2026-08-13T00:00:00.000Z','2026-08-13T00:00:00.000Z'),
  ('watch-gamesradar','feed-gamesradar','approved_feed','discovery','hold','{"feedUrl":"https://www.gamesradar.com/feeds.xml/","itemLimit":1,"mode":"bounded_daily_discovery_rss_atom","privateOnly":true,"autoPublish":false,"noDraft":true,"holdReason":"Curated reserve: four discovery feeds are active."}','2026-08-13T00:00:00.000Z','2026-08-13T00:00:00.000Z');

INSERT OR IGNORE INTO `audit_events` (`id`,`actor_email`,`action`,`entity_type`,`entity_id`,`details`,`created_at`) VALUES
  ('audit-feed-catalog-20260813','owner@myrpg.io','tiered_feed_catalog_seeded','source_feed_catalog','tiered-feed-catalog-20260813','{"primaryFeeds":2,"activeDiscoveryFeeds":4,"reserveDiscoveryFeeds":2,"privateOnly":true,"autoPublish":false,"discoveryRequiresOfficialVerification":true}','2026-08-13T00:00:00.000Z');
