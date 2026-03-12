import { searchSearxng } from '@/lib/searxng';
import { findLeaf } from '@/lib/discover/taxonomy';
import db from '@/lib/db';
import { discoverTopics, discoverInteractions } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

// Legacy built-in topic config (kept for backward compatibility)
const legacyTopics: Record<
  string,
  { query: string[]; links: string[] }
> = {
  tech: {
    query: ['technology news', 'latest tech', 'AI', 'science and innovation'],
    links: ['techcrunch.com', 'wired.com', 'theverge.com'],
  },
  finance: {
    query: ['finance news', 'economy', 'stock market', 'investing'],
    links: ['bloomberg.com', 'cnbc.com', 'marketwatch.com'],
  },
  art: {
    query: ['art news', 'culture', 'modern art', 'cultural events'],
    links: ['artnews.com', 'hyperallergic.com', 'theartnewspaper.com'],
  },
  sports: {
    query: ['sports news', 'latest sports', 'cricket football tennis'],
    links: ['espn.com', 'bbc.com/sport', 'skysports.com'],
  },
  entertainment: {
    query: ['entertainment news', 'movies', 'TV shows', 'celebrities'],
    links: ['hollywoodreporter.com', 'variety.com', 'deadline.com'],
  },
};

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 3);
}

function buildWordFreq(titles: string[]): Record<string, number> {
  const freq: Record<string, number> = {};
  for (const title of titles) {
    for (const word of tokenize(title)) {
      freq[word] = (freq[word] ?? 0) + 1;
    }
  }
  return freq;
}

async function getPersonalizationScores(
  results: { title?: string; url?: string }[],
): Promise<Map<string, number>> {
  const scores = new Map<string, number>();
  try {
    const interactions = await db
      .select()
      .from(discoverInteractions)
      .orderBy(desc(discoverInteractions.createdAt))
      .limit(200);

    const likedTitles = interactions
      .filter((i) => i.action === 'like' && i.articleTitle)
      .map((i) => i.articleTitle as string);
    const dislikedTitles = interactions
      .filter((i) => i.action === 'dislike' && i.articleTitle)
      .map((i) => i.articleTitle as string);

    if (likedTitles.length === 0 && dislikedTitles.length === 0) {
      return scores;
    }

    const likedFreq = buildWordFreq(likedTitles);
    const dislikedFreq = buildWordFreq(dislikedTitles);

    for (const result of results) {
      if (!result.title || !result.url) continue;
      let score = 0;
      for (const word of tokenize(result.title)) {
        score += likedFreq[word] ?? 0;
        score -= dislikedFreq[word] ?? 0;
      }
      if (score !== 0) {
        scores.set(result.url, score);
      }
    }
  } catch {
    // DB not ready yet — skip personalization silently
  }
  return scores;
}

export const GET = async (req: Request) => {
  try {
    const params = new URL(req.url).searchParams;
    const mode: 'normal' | 'preview' =
      (params.get('mode') as 'normal' | 'preview') || 'normal';
    const topicParam = params.get('topic') || 'tech';

    let queries: string[] = [];
    let links: string[] = [];

    if (topicParam.startsWith('custom:')) {
      // Custom user topic from DB
      const id = parseInt(topicParam.slice(7), 10);
      if (!isNaN(id)) {
        const [row] = await db
          .select()
          .from(discoverTopics)
          .where(eq(discoverTopics.id, id))
          .limit(1);
        if (row) {
          try {
            queries = JSON.parse(row.searchQueries) as string[];
          } catch {
            queries = [row.label];
          }
          if (queries.length === 0) queries = [row.label];
        }
      }
      if (queries.length === 0) {
        return Response.json({ blogs: [] }, { status: 200 });
      }
    } else {
      // Try taxonomy first, then fall back to legacy topics
      const leaf = findLeaf(topicParam);
      if (leaf) {
        queries = leaf.searchQueries;
        links = leaf.searchSites;
      } else if (legacyTopics[topicParam]) {
        queries = legacyTopics[topicParam].query;
        links = legacyTopics[topicParam].links;
      } else {
        // Unknown topic key — use it as a raw query
        queries = [topicParam];
      }
    }

    let data: { title?: string; url?: string; thumbnail?: string; content?: string }[] = [];

    if (mode === 'normal') {
      const seenUrls = new Set<string>();

      if (links.length > 0) {
        // Site-constrained search (taxonomy or legacy topics)
        data = (
          await Promise.all(
            links.flatMap((link) =>
              queries.map(async (query) => {
                return (
                  await searchSearxng(`site:${link} ${query}`, {
                    engines: ['bing news'],
                    pageno: 1,
                    language: 'en',
                  })
                ).results;
              }),
            ),
          )
        )
          .flat()
          .filter((item) => {
            const url = item.url?.toLowerCase().trim();
            if (!url || seenUrls.has(url)) return false;
            seenUrls.add(url);
            return true;
          });
      } else {
        // Custom topic — search without site constraint
        data = (
          await Promise.all(
            queries.map(async (query) => {
              return (
                await searchSearxng(query, {
                  engines: ['bing news'],
                  pageno: 1,
                  language: 'en',
                })
              ).results;
            }),
          )
        )
          .flat()
          .filter((item) => {
            const url = item.url?.toLowerCase().trim();
            if (!url || seenUrls.has(url)) return false;
            seenUrls.add(url);
            return true;
          });
      }

      // Apply personalization re-ranking (stable sort)
      const scores = await getPersonalizationScores(data);
      if (scores.size > 0) {
        data = data
          .map((item, idx) => ({ item, idx, score: scores.get(item.url ?? '') ?? 0 }))
          .sort((a, b) => b.score - a.score || a.idx - b.idx)
          .map(({ item }) => item);
      } else {
        data = data.sort(() => Math.random() - 0.5);
      }
    } else {
      // Preview mode
      const query = queries[Math.floor(Math.random() * queries.length)];
      const searchQuery =
        links.length > 0
          ? `site:${links[Math.floor(Math.random() * links.length)]} ${query}`
          : query;
      data = (
        await searchSearxng(searchQuery, {
          engines: ['bing news'],
          pageno: 1,
          language: 'en',
        })
      ).results;
    }

    return Response.json({ blogs: data }, { status: 200 });
  } catch (err) {
    console.error(`An error occurred in discover route: ${err}`);
    return Response.json({ blogs: [] }, { status: 200 });
  }
};
