import { sql } from 'drizzle-orm';
import { text, integer, real, sqliteTable } from 'drizzle-orm/sqlite-core';
import { Block } from '../types';
import { SearchSources } from '../agents/search/types';

export const messages = sqliteTable('messages', {
  id: integer('id').primaryKey(),
  messageId: text('messageId').notNull(),
  chatId: text('chatId').notNull(),
  backendId: text('backendId').notNull(),
  query: text('query').notNull(),
  createdAt: text('createdAt').notNull(),
  responseBlocks: text('responseBlocks', { mode: 'json' })
    .$type<Block[]>()
    .default(sql`'[]'`),
  status: text({ enum: ['answering', 'completed', 'error'] }).default(
    'answering',
  ),
});

interface DBFile {
  name: string;
  fileId: string;
}

export const chats = sqliteTable('chats', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  createdAt: text('createdAt').notNull(),
  sources: text('sources', {
    mode: 'json',
  })
    .$type<SearchSources[]>()
    .default(sql`'[]'`),
  files: text('files', { mode: 'json' })
    .$type<DBFile[]>()
    .default(sql`'[]'`),
});

export const rssFeeds = sqliteTable('rss_feeds', {
  id: text('id').primaryKey(),
  url: text('url').notNull().unique(),
  title: text('title').notNull().default(''),
  description: text('description').notNull().default(''),
  siteUrl: text('siteUrl').notNull().default(''),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  pollIntervalMinutes: integer('pollIntervalMinutes').notNull().default(30),
  lastFetchedAt: text('lastFetchedAt'),
  lastFetchError: text('lastFetchError'),
  createdAt: text('createdAt').notNull(),
});

export const rssItems = sqliteTable('rss_items', {
  id: text('id').primaryKey(),
  feedId: text('feedId')
    .notNull()
    .references(() => rssFeeds.id, { onDelete: 'cascade' }),
  guid: text('guid').notNull(),
  url: text('url').notNull(),
  title: text('title').notNull(),
  snippet: text('snippet').notNull().default(''),
  author: text('author').notNull().default(''),
  publishedAt: text('publishedAt').notNull(),
  fetchedAt: text('fetchedAt').notNull(),
  isRead: integer('isRead', { mode: 'boolean' }).notNull().default(false),
  importanceScore: real('importanceScore').notNull().default(0),
  isImportant: integer('isImportant', { mode: 'boolean' })
    .notNull()
    .default(false),
  isDismissed: integer('isDismissed', { mode: 'boolean' })
    .notNull()
    .default(false),
});

export type RssFeed = typeof rssFeeds.$inferSelect;
export type NewRssFeed = typeof rssFeeds.$inferInsert;
export type RssItem = typeof rssItems.$inferSelect;
export type NewRssItem = typeof rssItems.$inferInsert;
