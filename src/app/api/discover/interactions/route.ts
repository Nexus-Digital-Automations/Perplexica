import { NextRequest } from 'next/server';
import db from '@/lib/db';
import { discoverInteractions } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';

export const POST = async (req: NextRequest) => {
  try {
    const { articleUrl, articleTitle, articleThumbnail, topicKey, action } =
      (await req.json()) as {
        articleUrl: string;
        articleTitle?: string;
        articleThumbnail?: string;
        topicKey?: string;
        action: 'like' | 'dislike' | 'save';
      };

    if (!articleUrl || !action) {
      return Response.json(
        { message: 'articleUrl and action are required' },
        { status: 400 },
      );
    }

    // INSERT OR IGNORE semantics via onConflictDoNothing
    await db
      .insert(discoverInteractions)
      .values({ articleUrl, articleTitle, articleThumbnail, topicKey, action })
      .onConflictDoNothing();

    return Response.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error('Error saving interaction:', err);
    return Response.json({ message: 'Failed to save interaction' }, { status: 500 });
  }
};

export const DELETE = async (req: NextRequest) => {
  try {
    const { articleUrl, action } = (await req.json()) as {
      articleUrl: string;
      action: 'like' | 'dislike' | 'save';
    };

    if (!articleUrl || !action) {
      return Response.json(
        { message: 'articleUrl and action are required' },
        { status: 400 },
      );
    }

    await db
      .delete(discoverInteractions)
      .where(
        and(
          eq(discoverInteractions.articleUrl, articleUrl),
          eq(discoverInteractions.action, action),
        ),
      );

    return Response.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error('Error deleting interaction:', err);
    return Response.json({ message: 'Failed to delete interaction' }, { status: 500 });
  }
};
