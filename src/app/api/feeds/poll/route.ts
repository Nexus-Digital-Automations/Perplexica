export const runtime = 'nodejs';

import { runDuePolls } from '@/lib/rss/poller';

export const POST = async (_req: Request) => {
  try {
    const polled = await runDuePolls();
    return Response.json({ polled }, { status: 200 });
  } catch (err) {
    console.error('Error in POST /api/feeds/poll:', err);
    return Response.json({ message: 'An error has occurred.' }, { status: 500 });
  }
};
