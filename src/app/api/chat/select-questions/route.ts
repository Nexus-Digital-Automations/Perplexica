import { z } from 'zod';
import SessionManager from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required'),
  selectedQuestions: z
    .array(z.string())
    .min(1, 'Select at least one question'),
});

export const POST = async (req: Request) => {
  try {
    const raw = await req.json();
    const parsed = bodySchema.safeParse(raw);

    if (!parsed.success) {
      return Response.json(
        {
          message: 'Invalid request',
          error: parsed.error.issues.map((e) => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: 400 },
      );
    }

    const { sessionId, selectedQuestions } = parsed.data;

    const session = SessionManager.getSession(sessionId);
    if (!session) {
      return Response.json(
        { message: 'Session not found or expired' },
        { status: 404 },
      );
    }

    const submitted = session.submitSelection(selectedQuestions);
    if (!submitted) {
      return Response.json(
        { message: 'No pending question selection for this session' },
        { status: 409 },
      );
    }

    return Response.json({ ok: true });
  } catch (err) {
    console.error('Error processing question selection:', err);
    return Response.json(
      { message: 'Failed to process question selection' },
      { status: 500 },
    );
  }
};
