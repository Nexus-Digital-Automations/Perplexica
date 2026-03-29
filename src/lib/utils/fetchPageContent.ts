import TurndownService from 'turndown';
import { splitText } from './splitText';
import { bestWindowMatch } from '@/lib/verification/textSimilarity';

export const turndown = new TurndownService();

export type Passage = {
  text: string;          // Verbatim chunk text (unmodified from source)
  score: number;         // Relevance score to the extraction query
  charOffset: number;    // Approximate character offset in the original markdown
};

/**
 * Fetch a URL, convert HTML to markdown, split into semantic chunks,
 * score each chunk against the query, and return the top N most relevant
 * chunks concatenated. Falls back to `fallback` on any failure.
 */
export async function fetchAndExtract(
  url: string,
  query: string,
  topChunks = 3,
  fallback = '',
): Promise<string> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Perplexica/1.0)',
        Accept: 'text/html,application/xhtml+xml',
      },
    });

    clearTimeout(timeoutId);

    if (!res.ok) return fallback;

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('text/plain')) {
      return fallback;
    }

    const html = await res.text();
    if (!html || html.length < 100) return fallback;

    const markdown = turndown.turndown(html);
    if (!markdown || markdown.length < 50) return fallback;

    const chunks = splitText(markdown, 512, 64);
    if (chunks.length === 0) return fallback;

    // Score each chunk against the query
    const scored = chunks.map((chunk) => {
      const { score } = bestWindowMatch(query, chunk);
      return { chunk, score };
    });

    // Sort by relevance descending, take top N
    scored.sort((a, b) => b.score - a.score);
    const selected = scored.slice(0, topChunks);

    const enriched = selected.map((s) => s.chunk).join('\n\n');
    return enriched || fallback;
  } catch {
    return fallback;
  }
}

/**
 * Fetch a URL and convert HTML to markdown.
 * Returns null on failure.
 */
export async function fetchPageMarkdown(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Perplexica/1.0)',
        Accept: 'text/html,application/xhtml+xml',
      },
    });

    clearTimeout(timeoutId);

    if (!res.ok) return null;

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('text/plain')) {
      return null;
    }

    const html = await res.text();
    if (!html || html.length < 100) return null;

    const markdown = turndown.turndown(html);
    if (!markdown || markdown.length < 50) return null;

    return markdown;
  } catch {
    return null;
  }
}

/**
 * Fetch a URL (or use cached markdown), extract relevant passages for multiple queries.
 * For each query independently, score all chunks and take top `topPerQuery` chunks.
 * Deduplicate passages, keeping only the one with the highest score.
 * Returns passages sorted by score descending.
 */
export async function fetchAndExtractPassages(
  url: string,
  queries: string[],
  topPerQuery = 2,
  cachedMarkdown?: string,
): Promise<Passage[]> {
  try {
    let markdown: string;
    
    if (cachedMarkdown) {
      markdown = cachedMarkdown;
    } else {
      const fetchedMarkdown = await fetchPageMarkdown(url);
      if (!fetchedMarkdown) {
        return [];
      }
      markdown = fetchedMarkdown;
    }

    const chunks = splitText(markdown, 512, 64);
    if (chunks.length === 0) {
      return [];
    }

    // For each query, score all chunks and collect top passages
    const allPassages: Passage[] = [];
    
    for (const query of queries) {
      const scoredChunks = chunks.map((chunk, index) => {
        const { score } = bestWindowMatch(query, chunk);
        return {
          text: chunk,
          score,
          charOffset: index * 512, // Approximate character offset
        };
      });
      
      // Sort by score descending and take top per query
      scoredChunks.sort((a, b) => b.score - a.score);
      const topPassages = scoredChunks.slice(0, topPerQuery);
      allPassages.push(...topPassages);
    }

    // Deduplicate: if same text appears multiple times, keep only the highest score
    const passageMap = new Map<string, Passage>();
    for (const passage of allPassages) {
      const existing = passageMap.get(passage.text);
      if (!existing || passage.score > existing.score) {
        passageMap.set(passage.text, passage);
      }
    }

    // Convert back to array and sort by score descending
    const deduplicated = Array.from(passageMap.values());
    deduplicated.sort((a, b) => b.score - a.score);
    
    return deduplicated;
  } catch {
    return [];
  }
}