INSERT OR IGNORE INTO `source_watchlist` (`id`,`source_id`,`check_mode`,`feed_tier`,`status`,`note`,`created_at`,`updated_at`)
SELECT 'watch-playstation-blog-primary', `id`, 'approved_feed', 'primary', 'ready', '{"feedUrl":"https://blog.playstation.com/feed/","itemLimit":2,"mode":"bounded_daily_rss_atom","privateOnly":true,"autoPublish":false}', '2026-08-13T00:00:00.000Z', '2026-08-13T00:00:00.000Z'
FROM `sources` WHERE `domain` = 'blog.playstation.com';

INSERT OR IGNORE INTO `source_watchlist` (`id`,`source_id`,`check_mode`,`feed_tier`,`status`,`note`,`created_at`,`updated_at`)
SELECT 'watch-xbox-wire-primary', `id`, 'approved_feed', 'primary', 'ready', '{"feedUrl":"https://news.xbox.com/en-us/feed/","itemLimit":2,"mode":"bounded_daily_rss_atom","privateOnly":true,"autoPublish":false}', '2026-08-13T00:00:00.000Z', '2026-08-13T00:00:00.000Z'
FROM `sources` WHERE `domain` = 'news.xbox.com';

INSERT OR IGNORE INTO `audit_events` (`id`,`actor_email`,`action`,`entity_type`,`entity_id`,`details`,`created_at`) VALUES
  ('audit-primary-feed-backfill-20260813','owner@myrpg.io','primary_feed_watch_backfilled','source_feed_catalog','primary-feed-backfill-20260813','{"domains":["blog.playstation.com","news.xbox.com"],"privateOnly":true,"autoPublish":false}','2026-08-13T00:00:00.000Z');
