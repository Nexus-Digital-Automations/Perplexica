import { Chunk } from '@/lib/types';
import {
  fetchAndExtractPassages,
  fetchPageMarkdown,
} from '@/lib/utils/fetchPageContent';

const MAX_CONCURRENT_FETCHES = 3;
const ENRICHMENT_TIMEOUT_MS = 20_000;

/**
 * Run async tasks with a concurrency limit.
 */
async function pMap<T>(
  items: T[],
  fn: (item: T) => Promise<void>,
  concurrency: number,
): Promise<void> {
  let i = 0;
  const next = async (): Promise<void> => {
    while (i < items.length) {
      const idx = i++;
      await fn(items[idx]);
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => next()),
  );
}

/**
 * Enrich search result chunks with verbatim passages extracted from the
 * original pages. For each chunk with a URL, fetch the page (or use cache),
 * extract the most relevant passages for the given queries, and replace the
 * chunk's content with the verbatim text.
 *
 * Limits concurrent fetches to prevent overload.
 */
export async function enrichWithVerbatimPassages(
  results: Chunk[],
  queries: string[],
  urlCache?: Map<string, string>,
): Promise<void> {
  const enrichable = results.filter((chunk) => chunk.metadata.url);

  // Cap at top 10 results to avoid excessive fetching in multi-question flows
  const toEnrich = enrichable.slice(0, 10);

  const enrichOne = async (chunk: Chunk) => {
    try {
      let cachedMd = urlCache?.get(chunk.metadata.url);
      if (!cachedMd) {
        const md = await fetchPageMarkdown(chunk.metadata.url);
        if (md && urlCache) urlCache.set(chunk.metadata.url, md);
        cachedMd = md ?? undefined;
      }
      if (!cachedMd) return;

      const passages = await fetchAndExtractPassages(
        chunk.metadata.url,
        queries,
        2,
        cachedMd,
      );

      if (passages.length > 0) {
        chunk.metadata.originalSnippet = chunk.content;
        chunk.content = passages.map((p) => p.text).join('\n\n');
      }
    } catch {
      // Keep original content on failure
    }
  };

  await Promise.race([
    pMap(toEnrich, enrichOne, MAX_CONCURRENT_FETCHES),
    new Promise<void>((resolve) =>
      setTimeout(resolve, ENRICHMENT_TIMEOUT_MS),
    ),
  ]);

  // Evict processed URLs from cache — passages are already in chunk.content,
  // raw markdown (50-500KB per URL) is no longer needed
  for (const chunk of toEnrich) {
    urlCache?.delete(chunk.metadata.url);
  }
}
