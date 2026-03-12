import type { NormalizedItem } from './parser';

/**
 * Score an RSS item between 0.0 and 1.0.
 *
 * Breakdown:
 *   - Keyword match in title+snippet  → up to 0.6
 *   - Title-specific keyword match     → 0.1 bonus
 *   - Recency (published within 24h)   → sliding up to 0.3
 */
export function scoreItem(
  item: NormalizedItem,
  keywords: string,
): number {
  const terms = keywords
    .split(',')
    .map((k) => k.trim().toLowerCase())
    .filter(Boolean);

  const titleLower = item.title.toLowerCase();
  const snippetLower = item.snippet.toLowerCase();
  const combined = `${titleLower} ${snippetLower}`;

  let keywordScore = 0;
  let titleBonus = 0;

  if (terms.length > 0) {
    const matchedInCombined = terms.filter((t) => combined.includes(t)).length;
    keywordScore = Math.min((matchedInCombined / terms.length) * 0.6, 0.6);

    const matchedInTitle = terms.filter((t) => titleLower.includes(t)).length;
    if (matchedInTitle > 0) {
      titleBonus = 0.1;
    }
  }

  // Recency score: 0.3 at 0h, sliding linearly to 0 at 24h
  const ageMs = Date.now() - item.publishedAt.getTime();
  const ageHours = ageMs / (1000 * 60 * 60);
  const recencyScore = ageHours <= 24 ? Math.max(0, 0.3 * (1 - ageHours / 24)) : 0;

  return Math.min(1.0, keywordScore + titleBonus + recencyScore);
}
