export const runtime = 'nodejs';

import db from '@/lib/db';
import { rssFeeds, rssItems } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { parseFeed } from '@/lib/rss/parser';

export const GET = async (_req: Request) => {
  try {
    const feeds = db.select().from(rssFeeds).all();

    const unreadCounts = db
      .select({
        feedId: rssItems.feedId,
        unreadCount: sql<number>`count(*)`.as('unreadCount'),
      })
      .from(rssItems)
      .where(
        and(
          eq(rssItems.isRead, false),
          eq(rssItems.isDismissed, false),
        ),
      )
      .groupBy(rssItems.feedId)
      .all();

    const importantUnreadCounts = db
      .select({
        feedId: rssItems.feedId,
        count: sql<number>`count(*)`.as('count'),
      })
      .from(rssItems)
      .where(
        and(
          eq(rssItems.isRead, false),
          eq(rssItems.isDismissed, false),
          eq(rssItems.isImportant, true),
        ),
      )
      .groupBy(rssItems.feedId)
      .all();

    const unreadByFeed = new Map(
      unreadCounts.map((r) => [r.feedId, r.unreadCount]),
    );
    const importantByFeed = new Map(
      importantUnreadCounts.map((r) => [r.feedId, r.count]),
    );

    const feedsWithCounts = feeds.map((feed) => ({
      ...feed,
      unreadCount: unreadByFeed.get(feed.id) ?? 0,
    }));

    const totalUnread = feedsWithCounts.reduce(
      (sum, f) => sum + f.unreadCount,
      0,
    );
    const totalImportantUnread = Array.from(importantByFeed.values()).reduce(
      (sum, c) => sum + c,
      0,
    );

    return Response.json(
      { feeds: feedsWithCounts, totalUnread, totalImportantUnread },
      { status: 200 },
    );
  } catch (err) {
    console.error('Error in GET /api/feeds:', err);
    return Response.json({ message: 'An error has occurred.' }, { status: 500 });
  }
};

export const POST = async (req: Request) => {
  try {
    const body = await req.json();
    const url: string = body?.url;

    if (!url || typeof url !== 'string') {
      return Response.json({ message: 'url is required.' }, { status: 400 });
    }

    // Check for duplicate URL
    const existing = db
      .select()
      .from(rssFeeds)
      .where(eq(rssFeeds.url, url))
      .get();

    if (existing) {
      return Response.json(
        { message: 'Feed with this URL already exists.' },
        { status: 409 },
      );
    }

    // Validate the feed by parsing it
    let parsedFeed: Awaited<ReturnType<typeof parseFeed>>;
    try {
      parsedFeed = await parseFeed(url);
    } catch (parseErr) {
      const msg =
        parseErr instanceof Error ? parseErr.message : String(parseErr);
      return Response.json(
        { message: `Failed to parse feed: ${msg}` },
        { status: 400 },
      );
    }

    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    db.insert(rssFeeds)
      .values({
        id,
        url,
        title: parsedFeed.feedMeta.title,
        description: parsedFeed.feedMeta.description,
        siteUrl: parsedFeed.feedMeta.siteUrl,
        enabled: true,
        pollIntervalMinutes: 30,
        createdAt,
      })
      .run();

    const feed = db.select().from(rssFeeds).where(eq(rssFeeds.id, id)).get();

    return Response.json({ feed }, { status: 201 });
  } catch (err) {
    console.error('Error in POST /api/feeds:', err);
    return Response.json({ message: 'An error has occurred.' }, { status: 500 });
  }
};
