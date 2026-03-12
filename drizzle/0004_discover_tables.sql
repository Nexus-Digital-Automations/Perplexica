CREATE TABLE IF NOT EXISTS `discover_topics` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `label` text NOT NULL,
  `parent_path` text,
  `search_queries` text NOT NULL DEFAULT '[]',
  `sort_order` integer DEFAULT 0,
  `created_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `discover_interactions` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `article_url` text NOT NULL,
  `article_title` text,
  `article_thumbnail` text,
  `topic_key` text,
  `action` text NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(`article_url`, `action`)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `discover_interactions_action_idx` ON `discover_interactions` (`action`);
