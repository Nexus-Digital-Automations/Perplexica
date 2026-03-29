import { Chunk } from '@/lib/types';
import BaseLLM from '@/lib/models/base/llm';
import { extractCitations } from './citationExtractor';
import { bestWindowMatch, hasNegation, normalizeText } from './textSimilarity';
import {
  VerificationConfig,
  VerificationReport,
  VerificationResult,
  VerificationStatus,
} from './types';

export function verifyCitations(
  text: string,
  sources: Chunk[],
  config: VerificationConfig,
): VerificationReport {
  const citations = extractCitations(text);

  if (citations.length === 0) {
    return {
      totalCitations: 0,
      passed: 0,
      weak: 0,
      failed: 0,
      results: [],
      wasCorrected: false,
    };
  }

  // Pre-normalize source content to avoid redundant regex processing
  // when the same source is cited multiple times
  const normalizedSourceCache = new Map<number, string>();
  for (let i = 0; i < sources.length; i++) {
    if (sources[i]?.content) {
      normalizedSourceCache.set(i, normalizeText(sources[i].content));
    }
  }

  const results: VerificationResult[] = [];

  for (const citation of citations) {
    for (const citIndex of citation.citationIndices) {
      const source = sources[citIndex - 1];

      if (!source || !source.content) {
        results.push({
          citationIndex: citIndex,
          sentence: citation.sentenceText,
          similarity: 0,
          status: 'fail',
          matchedSnippet: '',
        });
        continue;
      }

      const { score, snippet } = bestWindowMatch(
        citation.sentenceText,
        source.content,
        3,
        normalizedSourceCache.get(citIndex - 1),
      );

      // Use stricter threshold for verbatim sources — the writer received
      // an exact quote, so we expect high token overlap.
      const isVerbatim = source.metadata.isVerbatim === true;
      const basePassThreshold = isVerbatim
        ? config.verbatimPassThreshold
        : config.passThreshold;

      // Adjust thresholds by source credibility tier:
      // Higher-tier sources (1-2) get easier thresholds (trusted);
      // Lower-tier sources (4-5) get harder thresholds (require stronger evidence).
      const tierNumber = (source.metadata.credibilityTier as number) || 3;
      const tierOffset =
        (tierNumber - 3) * (config.credibilityThresholdAdjustment ?? 0);
      const effectivePassThreshold = basePassThreshold + tierOffset;
      const effectiveWeakThreshold = config.weakThreshold + tierOffset;

      let status: VerificationStatus;
      if (score >= effectivePassThreshold) {
        status = 'pass';
      } else if (score >= effectiveWeakThreshold) {
        status = 'weak';
      } else {
        status = 'fail';
      }

      // Negation detection: if the claim and matched snippet disagree
      // on negation, demote 'pass' to 'weak' for human review.
      if (status === 'pass' && snippet) {
        const claimNeg = hasNegation(citation.sentenceText);
        const snippetNeg = hasNegation(snippet);
        if (claimNeg !== snippetNeg) {
          status = 'weak';
        }
      }

      results.push({
        citationIndex: citIndex,
        sentence: citation.sentenceText,
        similarity: Math.round(score * 1000) / 1000,
        status,
        matchedSnippet: snippet,
      });
    }
  }

  const passed = results.filter((r) => r.status === 'pass').length;
  const weak = results.filter((r) => r.status === 'weak').length;
  const failed = results.filter((r) => r.status === 'fail').length;

  return {
    totalCitations: results.length,
    passed,
    weak,
    failed,
    results,
    wasCorrected: false,
  };
}

export async function correctFailedCitations(
  originalText: string,
  report: VerificationReport,
  sources: Chunk[],
  llm: BaseLLM<any>,
  config: VerificationConfig,
): Promise<string | null> {
  const failedResults = report.results.filter((r) => r.status === 'fail');

  if (failedResults.length === 0) return null;

  const failedDetails = failedResults
    .map((r) => {
      const source = sources[r.citationIndex - 1];
      const sourceSnippet = source?.content?.slice(0, 500) || 'Source not found';
      return `- Sentence: "${r.sentence}"\n  Citation: [${r.citationIndex}]\n  Source [${r.citationIndex}] content: "${sourceSnippet}"`;
    })
    .join('\n\n');

  const correctionPrompt = `You are a citation accuracy editor. The following sentences have citations that don't match their source content.

Fix ONLY the sentences with incorrect citations by either:
1. Rephrasing to match what the source actually says (keeping the same citation number)
2. Removing the citation if the source doesn't support the claim at all

Keep ALL other text exactly the same. Return the COMPLETE text with corrections applied.

Failed citations:
${failedDetails}

Original text to correct:
${originalText}`;

  try {
    const result = await Promise.race([
      llm.generateText({
        messages: [
          { role: 'system', content: 'You are a precise citation editor. Return only the corrected text.' },
          { role: 'user', content: correctionPrompt },
        ],
        options: { temperature: config.correctionTemperature },
      }),
      new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error('Correction timeout')), config.correctionTimeoutMs),
      ),
    ]);

    if (!result) return null;

    return result.content;
  } catch (err) {
    console.warn('Citation correction failed or timed out:', err);
    return null;
  }
}
