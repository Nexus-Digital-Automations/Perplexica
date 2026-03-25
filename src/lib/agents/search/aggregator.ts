import { Chunk } from '@/lib/types';
import {
  tokenizeFlat,
  jaccardSimilarity,
  hasNegation,
} from '@/lib/verification/textSimilarity';

type SourceGroup = {
  index: number;
  url: string;
  title: string;
  tier: number;
  tierLabel: string;
  chunks: Chunk[];
};

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Deduplicate passages within a group: if two chunks share >70% Jaccard
 * similarity, keep only the longer one.
 */
function deduplicateChunks(chunks: Chunk[]): Chunk[] {
  const kept: Chunk[] = [];

  for (const chunk of chunks) {
    const chunkTokens = tokenizeFlat(chunk.content);
    let isDuplicate = false;

    for (let i = 0; i < kept.length; i++) {
      const keptTokens = tokenizeFlat(kept[i].content);
      if (jaccardSimilarity(chunkTokens, keptTokens) > 0.7) {
        // Keep the longer one
        if (chunk.content.length > kept[i].content.length) {
          kept[i] = chunk;
        }
        isDuplicate = true;
        break;
      }
    }

    if (!isDuplicate) {
      kept.push(chunk);
    }
  }

  return kept;
}

type Conflict = {
  sourceIndexA: number;
  sourceIndexB: number;
  passageA: string;
  passageB: string;
};

/**
 * Detect contradictions: passage pairs from different sources with moderate
 * token overlap but opposing negation patterns.
 */
function detectContradictions(
  groups: { index: number; chunks: Chunk[] }[],
): Conflict[] {
  const conflicts: Conflict[] = [];

  for (let gi = 0; gi < groups.length; gi++) {
    for (let gj = gi + 1; gj < groups.length; gj++) {
      for (const chunkA of groups[gi].chunks) {
        const tokensA = tokenizeFlat(chunkA.content);

        for (const chunkB of groups[gj].chunks) {
          const tokensB = tokenizeFlat(chunkB.content);
          const similarity = jaccardSimilarity(tokensA, tokensB);

          if (similarity > 0.3) {
            const negA = hasNegation(chunkA.content);
            const negB = hasNegation(chunkB.content);

            if (negA !== negB) {
              conflicts.push({
                sourceIndexA: groups[gi].index,
                sourceIndexB: groups[gj].index,
                passageA: chunkA.content.slice(0, 100),
                passageB: chunkB.content.slice(0, 100),
              });
            }
          }
        }
      }
    }
  }

  return conflicts;
}

/**
 * Cap low-tier sources when sufficient high-tier sources are available.
 * Never produces empty results — all sources pass through when high-tier
 * coverage is insufficient.
 */
function filterByCredibility(
  groups: Omit<SourceGroup, 'index'>[],
): Omit<SourceGroup, 'index'>[] {
  const highTier = groups.filter((g) => g.tier <= 3);
  const lowTier = groups.filter((g) => g.tier > 3);

  if (highTier.length >= 5) return [...highTier, ...lowTier.slice(0, 2)];
  if (highTier.length >= 3) return [...highTier, ...lowTier.slice(0, 3)];
  return groups;
}

/**
 * Aggregate research findings into structured XML context for the writer.
 * Groups by source URL, deduplicates, tags verbatim passages, and
 * detects potential contradictions across sources.
 */
export function aggregateEvidence(findings: Chunk[]): string {
  // Group chunks by URL
  const urlGroups = new Map<string, Chunk[]>();
  const urlOrder: string[] = [];

  for (const chunk of findings) {
    const url = chunk.metadata.url || '';
    if (!urlGroups.has(url)) {
      urlGroups.set(url, []);
      urlOrder.push(url);
    }
    urlGroups.get(url)!.push(chunk);
  }

  // Build indexed groups with deduplication
  const rawGroups: Omit<SourceGroup, 'index'>[] = [];

  for (const url of urlOrder) {
    const chunks = urlGroups.get(url)!;
    const deduped = deduplicateChunks(chunks);
    const title = chunks[0]?.metadata.title || url;
    const tier = (chunks[0]?.metadata.credibilityTier as number) || 5;
    const tierLabel = (chunks[0]?.metadata.credibilityLabel as string) || 'Unverified Web';
    rawGroups.push({ url, title, tier, tierLabel, chunks: deduped });
  }

  // Sort by credibility tier (lower = more credible)
  rawGroups.sort((a, b) => a.tier - b.tier);

  // Filter: cap low-tier sources when high-tier are sufficient
  const filtered = filterByCredibility(rawGroups);

  // Assign indices after sorting
  const indexedGroups: SourceGroup[] = filtered.map((g, i) => ({
    ...g,
    index: i + 1,
  }));

  // Detect contradictions
  const conflicts = detectContradictions(indexedGroups);

  // Build XML
  const lines: string[] = ['<evidence_brief>'];

  for (const group of indexedGroups) {
    lines.push(
      `  <source index="${group.index}" title="${escapeXml(group.title)}" url="${escapeXml(group.url)}" tier="${group.tier}" tier_label="${escapeXml(group.tierLabel)}">`,
    );

    for (const chunk of group.chunks) {
      const isVerbatim = chunk.metadata.isVerbatim === true;
      const attr = isVerbatim ? ' verbatim="true"' : '';
      lines.push(`    <passage${attr}>${escapeXml(chunk.content)}</passage>`);
    }

    lines.push('  </source>');
  }

  if (conflicts.length > 0) {
    lines.push('  <contradictions>');
    for (const c of conflicts) {
      lines.push(
        `    <conflict sources="${c.sourceIndexA},${c.sourceIndexB}">Source ${c.sourceIndexA}: "${escapeXml(c.passageA)}..." vs Source ${c.sourceIndexB}: "${escapeXml(c.passageB)}..."</conflict>`,
      );
    }
    lines.push('  </contradictions>');
  }

  lines.push('</evidence_brief>');
  return lines.join('\n');
}
