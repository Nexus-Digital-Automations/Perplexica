import db from '../db/index';
import { rssFeeds, rssItems } from '../db/schema';
import { and, eq, isNull, lt, or, sql } from 'drizzle-orm';
import { parseFeed } from './parser';
import { scoreItem } from './scorer';
import configManager from '../config/index';

let pollerStarted = false;

async function pollFeed(
  feed: typeof rssFeeds.$inferSelect,
): Promise<void> {
  try {
    const keywords = configManager.getConfig('feeds.interestKeywords', '') as string;
    const threshold = configManager.getConfig('feeds.importanceThreshold', 0.4) as number;

    const { feedMeta, items } = await parseFeed(feed.url);

    // Update feed metadata
    db.update(rssFeeds)
      .set({
        title: feedMeta.title || feed.title,
        description: feedMeta.description || feed.description,
        siteUrl: feedMeta.siteUrl || feed.siteUrl,
        lastFetchedAt: new Date().toISOString(),
        lastFetchError: null,
      })
      .where(eq(rssFeeds.id, feed.id))
      .run();

    const fetchedAt = new Date().toISOString();

    for (const item of items) {
      const score = scoreItem(item, keywords);
      const isImportant = score >= threshold;

      try {
        db.insert(rssItems)
          .values({
            id: crypto.randomUUID(),
            feedId: feed.id,
            guid: item.guid,
            url: item.url,
            title: item.title,
            snippet: item.snippet,
            author: item.author,
            publishedAt: item.publishedAt.toISOString(),
            fetchedAt,
            isRead: false,
            importanceScore: score,
            isImportant,
            isDismissed: false,
          })
          .onConflictDoNothing()
          .run();
      } catch {
        // Ignore duplicate constraint violations
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    db.update(rssFeeds)
      .set({
        lastFetchedAt: new Date().toISOString(),
        lastFetchError: msg,
      })
      .where(eq(rssFeeds.id, feed.id))
      .run();
    console.error(`[RSS Poller] Failed to poll feed ${feed.url}:`, msg);
  }
}

async function runDuePolls(): Promise<number> {
  const nowIso = new Date().toISOString();

  const dueFeeds = db
    .select()
    .from(rssFeeds)
    .where(
      and(
        eq(rssFeeds.enabled, true),
        or(
          isNull(rssFeeds.lastFetchedAt),
          sql`(unixepoch(${nowIso}) - unixepoch(${rssFeeds.lastFetchedAt})) >= ${rssFeeds.pollIntervalMinutes} * 60`,
        ),
      ),
    )
    .all();

  for (const feed of dueFeeds) {
    await pollFeed(feed);
  }

  return dueFeeds.length;
}

export function startRssPoller(): void {
  if (pollerStarted) return;
  pollerStarted = true;

  console.log('[RSS Poller] Starting background RSS poll scheduler');

  // Run immediately on startup
  runDuePolls().catch((err) =>
    console.error('[RSS Poller] Initial poll error:', err),
  );

  // Then every 60 seconds
  setInterval(() => {
    runDuePolls().catch((err) =>
      console.error('[RSS Poller] Poll cycle error:', err),
    );
  }, 60_000);
}

// Export for use in API routes
export { runDuePolls, pollFeed };
