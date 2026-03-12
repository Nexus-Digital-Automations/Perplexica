import { NextRequest } from 'next/server';
import db from '@/lib/db';
import { discoverTopics } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export const PUT = async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const { id } = await params;
    const topicId = parseInt(id, 10);
    if (isNaN(topicId)) {
      return Response.json({ message: 'Invalid topic ID' }, { status: 400 });
    }

    const { label } = (await req.json()) as { label: string };
    if (!label?.trim()) {
      return Response.json({ message: 'Label is required' }, { status: 400 });
    }

    const [updated] = await db
      .update(discoverTopics)
      .set({
        label: label.trim(),
        searchQueries: JSON.stringify([label.trim()]),
      })
      .where(eq(discoverTopics.id, topicId))
      .returning();

    if (!updated) {
      return Response.json({ message: 'Topic not found' }, { status: 404 });
    }

    return Response.json({ topic: updated }, { status: 200 });
  } catch (err) {
    console.error('Error updating discover topic:', err);
    return Response.json({ message: 'Failed to update topic' }, { status: 500 });
  }
};

export const DELETE = async (
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const { id } = await params;
    const topicId = parseInt(id, 10);
    if (isNaN(topicId)) {
      return Response.json({ message: 'Invalid topic ID' }, { status: 400 });
    }

    await db
      .delete(discoverTopics)
      .where(eq(discoverTopics.id, topicId));

    return Response.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error('Error deleting discover topic:', err);
    return Response.json({ message: 'Failed to delete topic' }, { status: 500 });
  }
};
