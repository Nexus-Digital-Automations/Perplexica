export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokenize(text: string): Set<string> {
  const normalized = normalizeText(text);
  const words = normalized.split(' ').filter((w) => w.length >= 3);
  const tokens = new Set<string>(words);

  for (let i = 0; i < words.length - 1; i++) {
    tokens.add(`${words[i]} ${words[i + 1]}`);
  }

  return tokens;
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

export function bestWindowMatch(
  claim: string,
  sourceContent: string,
  windowMultiplier = 3,
): { score: number; snippet: string } {
  const claimTokens = tokenize(claim);
  if (claimTokens.size === 0) return { score: 0, snippet: '' };

  const normalizedSource = normalizeText(sourceContent);
  const sourceWords = normalizedSource.split(' ');
  const claimWords = normalizeText(claim).split(' ').filter((w) => w.length >= 3);

  const windowSize = Math.max(
    claimWords.length * windowMultiplier,
    claimWords.length + 5,
  );

  if (sourceWords.length <= windowSize) {
    const sourceTokens = tokenize(sourceContent);
    return {
      score: jaccardSimilarity(claimTokens, sourceTokens),
      snippet: sourceContent.slice(0, 200),
    };
  }

  let bestScore = 0;
  let bestStart = 0;
  const step = Math.max(1, Math.floor(windowSize / 4));

  for (let i = 0; i <= sourceWords.length - windowSize; i += step) {
    const window = sourceWords.slice(i, i + windowSize).join(' ');
    const windowTokens = tokenize(window);
    const score = jaccardSimilarity(claimTokens, windowTokens);

    if (score > bestScore) {
      bestScore = score;
      bestStart = i;
    }
  }

  if (bestScore > 0) {
    const refineStart = Math.max(0, bestStart - step);
    const refineEnd = Math.min(sourceWords.length - windowSize, bestStart + step);

    for (let i = refineStart; i <= refineEnd; i++) {
      const window = sourceWords.slice(i, i + windowSize).join(' ');
      const windowTokens = tokenize(window);
      const score = jaccardSimilarity(claimTokens, windowTokens);

      if (score > bestScore) {
        bestScore = score;
        bestStart = i;
      }
    }
  }

  const snippet = sourceWords.slice(bestStart, bestStart + windowSize).join(' ');

  return { score: bestScore, snippet: snippet.slice(0, 200) };
}
