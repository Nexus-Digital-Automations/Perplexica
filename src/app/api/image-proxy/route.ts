export const runtime = 'nodejs';

const ALLOWED_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export const GET = async (req: Request) => {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get('url');

  if (!url) {
    return new Response('Missing url parameter', { status: 400 });
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return new Response('Invalid url parameter', { status: 400 });
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    return new Response('Only http/https URLs are allowed', { status: 400 });
  }

  try {
    const upstream = await fetch(parsedUrl.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Vane/1.0)',
        Accept: 'image/*',
      },
      signal: AbortSignal.timeout(10_000),
    });

    if (!upstream.ok) {
      return new Response(`Upstream error: ${upstream.status}`, { status: 502 });
    }

    const contentType = upstream.headers.get('content-type') ?? '';
    const baseType = contentType.split(';')[0].trim();
    if (!ALLOWED_CONTENT_TYPES.some((t) => baseType.startsWith(t.split('/')[0]) && baseType.includes('image'))) {
      return new Response('Upstream resource is not an image', { status: 400 });
    }

    const buffer = await upstream.arrayBuffer();
    if (buffer.byteLength > MAX_SIZE_BYTES) {
      return new Response('Image too large', { status: 413 });
    }

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType || 'image/jpeg',
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=3600',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (err: any) {
    console.error('[image-proxy] fetch error:', err?.message);
    return new Response('Failed to fetch image', { status: 502 });
  }
};
