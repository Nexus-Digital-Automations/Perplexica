import db from '@/lib/db';
import { discoverInteractions } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export const GET = async () => {
  try {
    const saved = await db
      .select()
      .from(discoverInteractions)
      .where(eq(discoverInteractions.action, 'save'))
      .orderBy(desc(discoverInteractions.createdAt));

    return Response.json({ articles: saved }, { status: 200 });
  } catch (err) {
    console.error('Error fetching saved articles:', err);
    return Response.json({ message: 'Failed to fetch saved articles' }, { status: 500 });
  }
};
