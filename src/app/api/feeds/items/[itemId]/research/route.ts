export const runtime = 'nodejs';

import db from '@/lib/db';
import { rssItems } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export const POST = async (
  _req: Request,
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

    db.update(rssItems)
      .set({ isRead: true })
      .where(eq(rssItems.id, itemId))
      .run();

    const redirectUrl = `/?q=Summary: ${item.url}`;

    return Response.json({ redirectUrl }, { status: 200 });
  } catch (err) {
    console.error('Error in POST /api/feeds/items/[itemId]/research:', err);
    return Response.json({ message: 'An error has occurred.' }, { status: 500 });
  }
};
