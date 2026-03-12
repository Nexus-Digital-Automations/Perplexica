export const runtime = 'nodejs';

import db from '@/lib/db';
import { rssItems, rssFeeds } from '@/lib/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';

export const GET = async (req: Request) => {
  try {
    const { searchParams } = new URL(req.url);

    const feedId = searchParams.get('feedId') ?? undefined;
    const filter = (searchParams.get('filter') ?? 'all') as
      | 'all'
      | 'unread'
      | 'important';
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.max(
      1,
      Math.min(100, parseInt(searchParams.get('limit') ?? '20', 10)),
    );
    const offset = (page - 1) * limit;

    // Build where conditions
    const conditions: SQL[] = [eq(rssItems.isDismissed, false)];

    if (feedId) {
      conditions.push(eq(rssItems.feedId, feedId));
    }

    if (filter === 'unread') {
      conditions.push(eq(rssItems.isRead, false));
    } else if (filter === 'important') {
      conditions.push(eq(rssItems.isImportant, true));
    }

    const whereClause = and(...conditions);

    // Count total matching items
    const totalRow = db
      .select({ total: sql<number>`count(*)`.as('total') })
      .from(rssItems)
      .where(whereClause)
      .get();

    const total = totalRow?.total ?? 0;

    // Fetch paginated items with feed title via join
    const rows = db
      .select({
        id: rssItems.id,
        feedId: rssItems.feedId,
        guid: rssItems.guid,
        url: rssItems.url,
        title: rssItems.title,
        snippet: rssItems.snippet,
        author: rssItems.author,
        publishedAt: rssItems.publishedAt,
        fetchedAt: rssItems.fetchedAt,
        isRead: rssItems.isRead,
        importanceScore: rssItems.importanceScore,
        isImportant: rssItems.isImportant,
        isDismissed: rssItems.isDismissed,
        feedTitle: rssFeeds.title,
      })
      .from(rssItems)
      .innerJoin(rssFeeds, eq(rssItems.feedId, rssFeeds.id))
      .where(whereClause)
      .orderBy(desc(rssItems.publishedAt))
      .limit(limit)
      .offset(offset)
      .all();

    return Response.json({ items: rows, total, page, limit }, { status: 200 });
  } catch (err) {
    console.error('Error in GET /api/feeds/items:', err);
    return Response.json({ message: 'An error has occurred.' }, { status: 500 });
  }
};
