export type ExtractedCitation = {
  sentenceText: string;
  citationIndices: number[];
  originalText: string;
};

function stripThinkBlocks(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/g, '');
}

function stripHeadings(text: string): string {
  return text.replace(/^#{1,6}\s+.*$/gm, '');
}

function splitSentences(text: string): string[] {
  const sentences: string[] = [];
  const parts = text.split(/(?<=[.!?])\s+(?=[A-Z])/);

  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.length > 0) {
      sentences.push(trimmed);
    }
  }

  return sentences;
}

export function extractCitations(text: string): ExtractedCitation[] {
  const cleaned = stripHeadings(stripThinkBlocks(text));
  const citationPattern = /\[(\d+(?:,\s*\d+)*)\]/g;
  const sentences = splitSentences(cleaned);
  const results: ExtractedCitation[] = [];

  for (const sentence of sentences) {
    const indices: number[] = [];
    let match;

    citationPattern.lastIndex = 0;
    while ((match = citationPattern.exec(sentence)) !== null) {
      const nums = match[1].split(',').map((s) => parseInt(s.trim(), 10));
      for (const n of nums) {
        if (!isNaN(n) && n > 0) {
          indices.push(n);
        }
      }
    }

    if (indices.length > 0) {
      const sentenceText = sentence.replace(citationPattern, '').trim();
      results.push({
        sentenceText,
        citationIndices: [...new Set(indices)],
        originalText: sentence,
      });
    }
  }

  return results;
}
