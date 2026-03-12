CREATE TABLE IF NOT EXISTS `rss_feeds` (
  `id` text PRIMARY KEY NOT NULL,
  `url` text NOT NULL UNIQUE,
  `title` text NOT NULL DEFAULT '',
  `description` text NOT NULL DEFAULT '',
  `siteUrl` text NOT NULL DEFAULT '',
  `enabled` integer NOT NULL DEFAULT 1,
  `pollIntervalMinutes` integer NOT NULL DEFAULT 30,
  `lastFetchedAt` text,
  `lastFetchError` text,
  `createdAt` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `rss_items` (
  `id` text PRIMARY KEY NOT NULL,
  `feedId` text NOT NULL REFERENCES `rss_feeds`(`id`) ON DELETE CASCADE,
  `guid` text NOT NULL,
  `url` text NOT NULL,
  `title` text NOT NULL,
  `snippet` text NOT NULL DEFAULT '',
  `author` text NOT NULL DEFAULT '',
  `publishedAt` text NOT NULL,
  `fetchedAt` text NOT NULL,
  `isRead` integer NOT NULL DEFAULT 0,
  `importanceScore` real NOT NULL DEFAULT 0,
  `isImportant` integer NOT NULL DEFAULT 0,
  `isDismissed` integer NOT NULL DEFAULT 0,
  UNIQUE(`feedId`, `guid`)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `rss_items_feedId_idx` ON `rss_items` (`feedId`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `rss_items_publishedAt_idx` ON `rss_items` (`publishedAt`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `rss_items_isRead_idx` ON `rss_items` (`isRead`);
