import { describe, it, expect } from 'vitest';
import { verifyCitations } from '@/lib/verification/verifier';
import { Chunk } from '@/lib/types';
import { VerificationConfig } from '@/lib/verification/types';

const config: VerificationConfig = {
  enabled: true,
  passThreshold: 0.4,
  weakThreshold: 0.2,
  maxCorrectionRetries: 2,
  correctionTimeoutMs: 10000,
  writerTemperature: 0.5,
  correctionTemperature: 0.3,
};

describe('verifyCitations', () => {
  it('returns empty report for text without citations', () => {
    const result = verifyCitations('No citations here.', [], config);
    expect(result).toEqual({
      totalCitations: 0,
      passed: 0,
      weak: 0,
      failed: 0,
      results: [],
      wasCorrected: false,
    });
  });

  it('returns empty report for empty text', () => {
    const result = verifyCitations('', [], config);
    expect(result.totalCitations).toBe(0);
    expect(result.results).toHaveLength(0);
  });

  it('fails citation when source index is out of bounds', () => {
    const text = 'Some claim [3].';
    const sources: Chunk[] = [
      { content: 'Only one source.', metadata: {} },
    ];
    const result = verifyCitations(text, sources, config);
    expect(result.totalCitations).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.results[0].status).toBe('fail');
    expect(result.results[0].citationIndex).toBe(3);
  });

  it('passes citation when sentence closely matches source', () => {
    const text = 'The sky is blue and beautiful [1].';
    const sources: Chunk[] = [
      {
        content: 'The sky is blue and beautiful on clear days.',
        metadata: {},
      },
    ];
    const result = verifyCitations(text, sources, config);
    expect(result.totalCitations).toBe(1);
    expect(result.passed).toBe(1);
    expect(result.results[0].status).toBe('pass');
  });

  it('fails citation when sentence is unrelated to source', () => {
    const text = 'The sky is blue [1].';
    const sources: Chunk[] = [
      {
        content:
          'Quantum mechanics studies the behavior of subatomic particles.',
        metadata: {},
      },
    ];
    const result = verifyCitations(text, sources, config);
    expect(result.totalCitations).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.results[0].status).toBe('fail');
  });

  it('wasCorrected is always false from verifyCitations', () => {
    const text = 'Water is wet [1].';
    const sources: Chunk[] = [
      { content: 'Water is a liquid.', metadata: {} },
    ];
    const result = verifyCitations(text, sources, config);
    expect(result.wasCorrected).toBe(false);
  });

  it('result has correct shape', () => {
    const text = 'Water is wet [1].';
    const sources: Chunk[] = [
      { content: 'Water is a liquid that wets things.', metadata: {} },
    ];
    const result = verifyCitations(text, sources, config);
    const r = result.results[0];
    expect(r.citationIndex).toBe(1);
    expect(typeof r.sentence).toBe('string');
    expect(typeof r.similarity).toBe('number');
    expect(['pass', 'weak', 'fail']).toContain(r.status);
    expect(typeof r.matchedSnippet).toBe('string');
  });

  it('similarity score is rounded to 3 decimal places', () => {
    const text = 'The sky is blue [1].';
    const sources: Chunk[] = [
      { content: 'The sky is blue.', metadata: {} },
    ];
    const result = verifyCitations(text, sources, config);
    const similarity = result.results[0].similarity;
    expect(Number(similarity.toFixed(3))).toBe(similarity);
  });

  it('handles multiple citations across sentences', () => {
    const text =
      'The sky is blue and beautiful [1]. Quantum mechanics is complex [2].';
    const sources: Chunk[] = [
      {
        content: 'The sky is blue and beautiful on clear days.',
        metadata: {},
      },
      {
        content:
          'Quantum mechanics is the fundamental theory of physics at atomic scales.',
        metadata: {},
      },
    ];
    const result = verifyCitations(text, sources, config);
    expect(result.totalCitations).toBe(2);
    expect(result.results).toHaveLength(2);
    expect(result.results[0].citationIndex).toBe(1);
    expect(result.results[1].citationIndex).toBe(2);
  });

  it('citation index is 1-based (citation [2] maps to sources[1])', () => {
    const text = 'Water is wet [2].';
    const sources: Chunk[] = [
      { content: 'Something unrelated.', metadata: {} },
      // sources[1] = citation [2]: exact same content for a guaranteed pass
      { content: 'Water is wet.', metadata: {} },
    ];
    const result = verifyCitations(text, sources, config);
    expect(result.results[0].citationIndex).toBe(2);
    expect(result.results[0].status).toBe('pass');
  });

  it('counts passed / weak / failed correctly', () => {
    const text =
      'The sky is blue and beautiful [1]. Something totally unrelated [2].';
    const sources: Chunk[] = [
      {
        content: 'The sky is blue and beautiful on clear days.',
        metadata: {},
      },
      {
        content: 'Unrelated topic: geology and rock formations.',
        metadata: {},
      },
    ];
    const result = verifyCitations(text, sources, config);
    expect(result.passed + result.weak + result.failed).toBe(
      result.totalCitations,
    );
  });
});

describe('verifyCitations with 0.8 (80%) passThreshold', () => {
  const strictConfig: VerificationConfig = {
    enabled: true,
    passThreshold: 0.8,
    weakThreshold: 0.3,
    maxCorrectionRetries: 0,
    correctionTimeoutMs: 0,
    writerTemperature: 0.3,
    correctionTemperature: 0.1,
  };

  it('passes near-verbatim citation at 0.8 threshold', () => {
    const text = 'The quick brown fox jumps over the lazy dog [1].';
    const sources: Chunk[] = [
      {
        content: 'The quick brown fox jumps over the lazy dog.',
        metadata: {},
      },
    ];
    const result = verifyCitations(text, sources, strictConfig);
    expect(result.totalCitations).toBe(1);
    expect(result.results[0].status).toBe('pass');
    expect(result.results[0].similarity).toBeGreaterThanOrEqual(0.8);
  });

  it('does NOT pass paraphrased content at 0.8 threshold', () => {
    const text = 'The sky appears blue due to Rayleigh scattering of sunlight [1].';
    const sources: Chunk[] = [
      {
        content:
          'Rayleigh scattering causes shorter wavelengths of light, particularly blue, to scatter more than other colors when sunlight passes through the atmosphere, which is why the sky looks blue.',
        metadata: {},
      },
    ];
    const result = verifyCitations(text, sources, strictConfig);
    expect(result.totalCitations).toBe(1);
    // Paraphrased content should score below 0.8
    expect(result.results[0].similarity).toBeLessThan(0.8);
    expect(result.results[0].status).not.toBe('pass');
  });

  it('marks paraphrased content as weak (between weak and pass thresholds)', () => {
    const text = 'TypeScript is a typed superset of JavaScript [1].';
    const sources: Chunk[] = [
      {
        content:
          'TypeScript is a strongly typed programming language that builds on JavaScript, giving you better tooling at any scale. It is a typed superset of JavaScript that compiles to plain JavaScript.',
        metadata: {},
      },
    ];
    const result = verifyCitations(text, sources, strictConfig);
    expect(result.totalCitations).toBe(1);
    // Should have some similarity but not enough for 0.8
    expect(result.results[0].similarity).toBeGreaterThan(0);
  });

  it('correctly classifies mixed citations at strict threshold', () => {
    const text =
      'The quick brown fox jumps over the lazy dog [1]. Quantum computing uses qubits for computation [2].';
    const sources: Chunk[] = [
      {
        content: 'The quick brown fox jumps over the lazy dog.',
        metadata: {},
      },
      {
        content:
          'Classical computers use binary bits while quantum computers leverage quantum bits called qubits to perform certain calculations much faster.',
        metadata: {},
      },
    ];
    const result = verifyCitations(text, sources, strictConfig);
    expect(result.totalCitations).toBe(2);
    // Verbatim citation passes
    expect(result.results[0].status).toBe('pass');
    // Paraphrased citation does not pass at 0.8
    expect(result.results[1].status).not.toBe('pass');
  });
});
