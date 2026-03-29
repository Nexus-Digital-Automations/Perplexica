import configManager from '@/lib/config';
import { NextRequest, NextResponse } from 'next/server';

export const POST = async (req: NextRequest) => {
  try {
    const body: { url?: string } = await req.json().catch(() => ({}));
    const url =
      body.url?.trim() || configManager.getCurrentConfig().search?.searxngURL;

    if (!url) {
      return NextResponse.json(
        { ok: false, message: 'No SearXNG URL configured' },
        { status: 200 },
      );
    }

    // Node.js fetch resolves localhost to ::1 (IPv6) first;
    // SearXNG typically listens on IPv4 only, causing timeouts.
    const fetchUrl = url.replace('://localhost', '://127.0.0.1');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const start = Date.now();
      const res = await fetch(`${fetchUrl}/search?format=json&q=test`, {
        signal: controller.signal,
      });
      const latencyMs = Date.now() - start;

      if (!res.ok) {
        return NextResponse.json({
          ok: false,
          message: `HTTP ${res.status}: ${res.statusText}`,
        });
      }

      await res.json();

      return NextResponse.json({ ok: true, latencyMs });
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return NextResponse.json({ ok: false, message: 'Connection timed out' });
      }
      return NextResponse.json({
        ok: false,
        message: err.message ?? 'Connection failed',
      });
    } finally {
      clearTimeout(timeout);
    }
  } catch (err) {
    console.error('Error in test-searxng:', err);
    return NextResponse.json(
      { ok: false, message: 'Internal server error' },
      { status: 500 },
    );
  }
};
