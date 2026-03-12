import { NextRequest } from 'next/server';
import db from '@/lib/db';
import { discoverTopics } from '@/lib/db/schema';
import { asc, sql } from 'drizzle-orm';

export const GET = async () => {
  try {
    const topics = await db
      .select()
      .from(discoverTopics)
      .orderBy(asc(discoverTopics.sortOrder), asc(discoverTopics.createdAt));
    return Response.json({ topics }, { status: 200 });
  } catch (err) {
    console.error('Error fetching discover topics:', err);
    return Response.json({ message: 'Failed to fetch topics' }, { status: 500 });
  }
};

export const POST = async (req: NextRequest) => {
  try {
    const { label, parentPath } = (await req.json()) as {
      label: string;
      parentPath?: string;
    };

    if (!label?.trim()) {
      return Response.json({ message: 'Label is required' }, { status: 400 });
    }

    const [inserted] = await db
      .insert(discoverTopics)
      .values({
        label: label.trim(),
        parentPath: parentPath ?? null,
        searchQueries: JSON.stringify([label.trim()]),
        sortOrder: 0,
      })
      .returning();

    return Response.json({ topic: inserted }, { status: 201 });
  } catch (err) {
    console.error('Error creating discover topic:', err);
    return Response.json({ message: 'Failed to create topic' }, { status: 500 });
  }
};
