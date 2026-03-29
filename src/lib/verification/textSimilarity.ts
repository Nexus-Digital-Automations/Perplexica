export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Tokenize text into unigrams and bigrams.
 * Bigrams are prefixed with "B:" so they occupy a separate namespace
 * and can be weighted differently in scoring.
 */
export function tokenize(text: string): { unigrams: Set<string>; bigrams: Set<string> } {
  const normalized = normalizeText(text);
  const words = normalized.split(' ').filter((w) => w.length >= 3);
  const unigrams = new Set<string>(words);
  const bigrams = new Set<string>();

  for (let i = 0; i < words.length - 1; i++) {
    bigrams.add(`${words[i]} ${words[i + 1]}`);
  }

  return { unigrams, bigrams };
}

/**
 * Legacy tokenize — returns flat Set for backward compatibility with
 * code outside verification (e.g. fetchPageContent, aggregator).
 */
export function tokenizeFlat(text: string): Set<string> {
  const { unigrams, bigrams } = tokenize(text);
  const combined = new Set<string>(unigrams);
  for (const b of bigrams) combined.add(b);
  return combined;
}

/**
 * Weighted containment: what fraction of the claim's tokens appear in the source?
 * Bigram matches count 1.5x because shared bigrams are stronger evidence
 * of faithful paraphrase than coincidental unigram overlap.
 */
export function weightedContainment(
  claim: { unigrams: Set<string>; bigrams: Set<string> },
  source: { unigrams: Set<string>; bigrams: Set<string> },
): number {
  const BIGRAM_WEIGHT = 1.5;

  let weightedFound = 0;
  let weightedTotal = 0;

  for (const token of claim.unigrams) {
    weightedTotal += 1;
    if (source.unigrams.has(token)) weightedFound += 1;
  }

  for (const token of claim.bigrams) {
    weightedTotal += BIGRAM_WEIGHT;
    if (source.bigrams.has(token)) weightedFound += BIGRAM_WEIGHT;
  }

  return weightedTotal === 0 ? 0 : weightedFound / weightedTotal;
}

export function containmentScore(claimTokens: Set<string>, sourceTokens: Set<string>): number {
  if (claimTokens.size === 0) return 0;
  let found = 0;
  for (const token of claimTokens) {
    if (sourceTokens.has(token)) found++;
  }
  return found / claimTokens.size;
}

export function jaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
  if (setA.size === 0 && setB.size === 0) return 1;
  if (setA.size === 0 || setB.size === 0) return 0;

  let intersection = 0;
  const smaller = setA.size <= setB.size ? setA : setB;
  const larger = setA.size <= setB.size ? setB : setA;

  for (const token of smaller) {
    if (larger.has(token)) intersection++;
  }

  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Negation words used to detect semantic inversions between claim and source.
 */
const NEGATION_PATTERN =
  /\b(not|no|never|none|neither|nor|isn't|aren't|wasn't|weren't|don't|doesn't|didn't|won't|wouldn't|can't|couldn't|shouldn't|hasn't|haven't|hadn't)\b/i;

export function hasNegation(text: string): boolean {
  return NEGATION_PATTERN.test(text);
}

/**
 * Find the best-matching window in sourceContent for the given claim.
 *
 * Scoring uses the maximum of:
 *   - Jaccard similarity (penalizes large sources, good for short-source matching)
 *   - Weighted containment * 0.85 (what fraction of claim tokens appear in source,
 *     bigrams weighted 1.5x — the right metric for citation checking)
 *
 * Returns the combined score and the best-matching snippet text.
 */
export function bestWindowMatch(
  claim: string,
  sourceContent: string,
  windowMultiplier = 3,
  preNormalizedSource?: string,
): { score: number; snippet: string } {
  const claimTokens = tokenize(claim);
  const claimFlat = tokenizeFlat(claim);
  if (claimFlat.size === 0) return { score: 0, snippet: '' };

  const normalizedSource = preNormalizedSource ?? normalizeText(sourceContent);
  const sourceWords = normalizedSource.split(' ');
  const claimWords = normalizeText(claim).split(' ').filter((w) => w.length >= 3);

  const windowSize = Math.max(
    claimWords.length * windowMultiplier,
    claimWords.length + 5,
  );

  if (sourceWords.length <= windowSize) {
    const sourceTokens = tokenize(sourceContent);
    const sourceFlat = tokenizeFlat(sourceContent);
    const jaccard = jaccardSimilarity(claimFlat, sourceFlat);
    const containment = weightedContainment(claimTokens, sourceTokens);
    return {
      score: Math.max(jaccard, containment * 0.85),
      snippet: sourceContent.slice(0, 200),
    };
  }

  let bestScore = 0;
  let bestStart = 0;
  const step = Math.max(1, Math.floor(windowSize / 4));

  for (let i = 0; i <= sourceWords.length - windowSize; i += step) {
    const windowText = sourceWords.slice(i, i + windowSize).join(' ');
    const windowTokens = tokenize(windowText);
    const windowFlat = tokenizeFlat(windowText);

    const jaccard = jaccardSimilarity(claimFlat, windowFlat);
    const containment = weightedContainment(claimTokens, windowTokens);
    const score = Math.max(jaccard, containment * 0.85);

    if (score > bestScore) {
      bestScore = score;
      bestStart = i;
      if (bestScore >= 0.95) break;
    }
  }

  // Refine around the best match
  if (bestScore > 0 && bestScore < 0.95) {
    const refineStart = Math.max(0, bestStart - step);
    const refineEnd = Math.min(sourceWords.length - windowSize, bestStart + step);

    for (let i = refineStart; i <= refineEnd; i++) {
      const windowText = sourceWords.slice(i, i + windowSize).join(' ');
      const windowTokens = tokenize(windowText);
      const windowFlat = tokenizeFlat(windowText);

      const jaccard = jaccardSimilarity(claimFlat, windowFlat);
      const containment = weightedContainment(claimTokens, windowTokens);
      const score = Math.max(jaccard, containment * 0.85);

      if (score > bestScore) {
        bestScore = score;
        bestStart = i;
      }
    }
  }

  const snippet = sourceWords.slice(bestStart, bestStart + windowSize).join(' ');

  return { score: bestScore, snippet: snippet.slice(0, 200) };
}
