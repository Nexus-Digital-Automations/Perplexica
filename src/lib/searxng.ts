import { getSearxngURL } from './config/serverRegistry';

interface SearxngSearchOptions {
  categories?: string[];
  engines?: string[];
  language?: string;
  pageno?: number;
}

interface SearxngSearchResult {
  title: string;
  url: string;
  content?: string;
  author?: string;
  engine?: string;
  engines?: string[];
  category?: string;
  score?: number;
  img_src?: string;
  thumbnail_src?: string;
  thumbnail?: string;
  iframe_src?: string;
}

const resultCache = new Map<
  string,
  { results: SearxngSearchResult[]; suggestions: string[]; ts: number }
>();
const CACHE_TTL_MS = 60_000;
const CACHE_MAX_SIZE = 200;

export function clearSearxngCache() {
  resultCache.clear();
}

export const searchSearxng = async (
  query: string,
  opts?: SearxngSearchOptions,
) => {
  const cacheKey = `${query}|${opts?.engines?.join(',')}|${opts?.categories?.join(',')}`;
  const cached = resultCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return { results: cached.results, suggestions: cached.suggestions };
  }

  const searxngURL = getSearxngURL();

  if (!searxngURL) {
    return { results: [] as SearxngSearchResult[], suggestions: [] as string[] };
  }

  // Node.js fetch resolves localhost to ::1 (IPv6) first;
  // SearXNG typically listens on IPv4 only, causing timeouts.
  const resolvedURL = searxngURL.replace('://localhost', '://127.0.0.1');

  const url = new URL(`${resolvedURL}/search?format=json`);
  url.searchParams.append('q', query);

  if (opts) {
    Object.keys(opts).forEach((key) => {
      const value = opts[key as keyof SearxngSearchOptions];
      if (Array.isArray(value)) {
        url.searchParams.append(key, value.join(','));
        return;
      }
      url.searchParams.append(key, value as string);
    });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`SearXNG error: ${res.statusText}`);
    }

    const data = await res.json();

    const results: SearxngSearchResult[] = (data.results || []).slice(0, 30);
    const suggestions: string[] = data.suggestions;

    resultCache.set(cacheKey, { results, suggestions, ts: Date.now() });
    if (resultCache.size > CACHE_MAX_SIZE) {
      const now = Date.now();
      for (const [k, v] of resultCache) {
        if (now - v.ts > CACHE_TTL_MS) resultCache.delete(k);
      }
    }

    return { results, suggestions };
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error('SearXNG search timed out');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
};
