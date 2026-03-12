export const runtime = 'nodejs';

import db from '@/lib/db';
import { rssItems } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export const PATCH = async (
  req: Request,
  { params }: { params: Promise<{ itemId: string }> },
) => {
  try {
    const { itemId } = await params;

    const item = db
      .select()
      .from(rssItems)
      .where(eq(rssItems.id, itemId))
      .get();

    if (!item) {
      return Response.json({ message: 'Item not found.' }, { status: 404 });
    }

    const body = await req.json();
    const updates: Partial<{
      isRead: boolean;
      isDismissed: boolean;
      isImportant: boolean;
    }> = {};

    if (typeof body.isRead === 'boolean') {
      updates.isRead = body.isRead;
    }
    if (typeof body.isDismissed === 'boolean') {
      updates.isDismissed = body.isDismissed;
    }
    if (typeof body.isImportant === 'boolean') {
      updates.isImportant = body.isImportant;
    }

    if (Object.keys(updates).length === 0) {
      return Response.json(
        { message: 'No valid fields to update.' },
        { status: 400 },
      );
    }

    db.update(rssItems).set(updates).where(eq(rssItems.id, itemId)).run();

    const updated = db
      .select()
      .from(rssItems)
      .where(eq(rssItems.id, itemId))
      .get();

    return Response.json({ item: updated }, { status: 200 });
  } catch (err) {
    console.error('Error in PATCH /api/feeds/items/[itemId]:', err);
    return Response.json({ message: 'An error has occurred.' }, { status: 500 });
  }
};
