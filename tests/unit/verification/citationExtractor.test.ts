import { describe, it, expect } from 'vitest';
import { extractCitations, ExtractedCitation } from '@/lib/verification/citationExtractor';

describe('citationExtractor', () => {
  it('text with no citations → []', () => {
    const text = 'This is a sentence without any citations.';
    const result = extractCitations(text);
    expect(result).toEqual([]);
  });

  it('single citation [1] → one result with citationIndices: [1]', () => {
    const text = 'This is a sentence with a citation [1].';
    const result = extractCitations(text);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      sentenceText: 'This is a sentence with a citation.',
      citationIndices: [1],
      originalText: 'This is a sentence with a citation [1].',
    });
  });

  it('multi-citation [1,2] in one marker → indices [1, 2]', () => {
    const text = 'This cites multiple sources [1,2].';
    const result = extractCitations(text);
    expect(result).toHaveLength(1);
    expect(result[0].citationIndices).toEqual([1, 2]);
  });

  it('multiple citations in one sentence → indices include all', () => {
    const text = 'This cites [1] and [2] and [3].';
    const result = extractCitations(text);
    expect(result).toHaveLength(1);
    expect(result[0].citationIndices).toEqual([1, 2, 3]);
  });

  it('duplicate citation indices deduped', () => {
    const text = 'This cites [1,2,1,2].';
    const result = extractCitations(text);
    expect(result).toHaveLength(1);
    expect(result[0].citationIndices).toEqual([1, 2]);
  });

  it('strips <think> blocks before extracting', () => {
    const text = '<think>Some reasoning here</think>This is the actual sentence [1].';
    const result = extractCitations(text);
    expect(result).toHaveLength(1);
    expect(result[0].sentenceText).toBe('This is the actual sentence.');
    expect(result[0].citationIndices).toEqual([1]);
  });

  it('strips headings (#, ##) — headings alone don\'t produce citation results', () => {
    const text = '# Heading\nThis is a sentence [1].\n## Subheading\nAnother sentence [2].';
    const result = extractCitations(text);
    expect(result).toHaveLength(2);
    expect(result[0].sentenceText).toBe('This is a sentence.');
    expect(result[0].citationIndices).toEqual([1]);
    expect(result[1].sentenceText).toBe('Another sentence.');
    expect(result[1].citationIndices).toEqual([2]);
  });

  it('zero or negative citation numbers ignored (only n > 0)', () => {
    const text = 'This has [0] and [-1] and [2].';
    const result = extractCitations(text);
    expect(result).toHaveLength(1);
    expect(result[0].citationIndices).toEqual([2]);
  });

  it('empty string → []', () => {
    const result = extractCitations('');
    expect(result).toEqual([]);
  });

  it('sentenceText strips the [N] markers from the text', () => {
    const text = 'Sentence with [1] citation [2,3].';
    const result = extractCitations(text);
    expect(result[0].sentenceText).toBe('Sentence with citation.');
  });

  it('handles multiple sentences with citations', () => {
    const text = 'First sentence [1]. Second sentence [2]. Third with [3,4].';
    const result = extractCitations(text);
    expect(result).toHaveLength(3);
    expect(result[0].sentenceText).toBe('First sentence.');
    expect(result[0].citationIndices).toEqual([1]);
    expect(result[1].sentenceText).toBe('Second sentence.');
    expect(result[1].citationIndices).toEqual([2]);
    expect(result[2].sentenceText).toBe('Third with.');
    expect(result[2].citationIndices).toEqual([3, 4]);
  });

  it('handles citations with spaces in brackets', () => {
    const text = 'Sentence with [1, 2, 3] citations.';
    const result = extractCitations(text);
    expect(result[0].citationIndices).toEqual([1, 2, 3]);
  });
});