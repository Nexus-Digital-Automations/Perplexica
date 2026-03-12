export const runtime = 'nodejs';

import db from '@/lib/db';
import { rssFeeds } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export const GET = async (
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const { id } = await params;

    const feed = db.select().from(rssFeeds).where(eq(rssFeeds.id, id)).get();

    if (!feed) {
      return Response.json({ message: 'Feed not found.' }, { status: 404 });
    }

    return Response.json({ feed }, { status: 200 });
  } catch (err) {
    console.error('Error in GET /api/feeds/[id]:', err);
    return Response.json({ message: 'An error has occurred.' }, { status: 500 });
  }
};

export const PATCH = async (
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const { id } = await params;

    const feed = db.select().from(rssFeeds).where(eq(rssFeeds.id, id)).get();

    if (!feed) {
      return Response.json({ message: 'Feed not found.' }, { status: 404 });
    }

    const body = await req.json();
    const updates: Partial<{ enabled: boolean; pollIntervalMinutes: number }> =
      {};

    if (typeof body.enabled === 'boolean') {
      updates.enabled = body.enabled;
    }
    if (typeof body.pollIntervalMinutes === 'number') {
      updates.pollIntervalMinutes = body.pollIntervalMinutes;
    }

    if (Object.keys(updates).length === 0) {
      return Response.json(
        { message: 'No valid fields to update.' },
        { status: 400 },
      );
    }

    db.update(rssFeeds).set(updates).where(eq(rssFeeds.id, id)).run();

    const updated = db
      .select()
      .from(rssFeeds)
      .where(eq(rssFeeds.id, id))
      .get();

    return Response.json({ feed: updated }, { status: 200 });
  } catch (err) {
    console.error('Error in PATCH /api/feeds/[id]:', err);
    return Response.json({ message: 'An error has occurred.' }, { status: 500 });
  }
};

export const DELETE = async (
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const { id } = await params;

    const feed = db.select().from(rssFeeds).where(eq(rssFeeds.id, id)).get();

    if (!feed) {
      return Response.json({ message: 'Feed not found.' }, { status: 404 });
    }

    db.delete(rssFeeds).where(eq(rssFeeds.id, id)).run();

    return Response.json(
      { message: 'Feed deleted successfully.' },
      { status: 200 },
    );
  } catch (err) {
    console.error('Error in DELETE /api/feeds/[id]:', err);
    return Response.json({ message: 'An error has occurred.' }, { status: 500 });
  }
};
