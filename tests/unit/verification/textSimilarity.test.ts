import { describe, it, expect } from 'vitest';
import { normalizeText, tokenizeFlat, jaccardSimilarity, containmentScore, bestWindowMatch, hasNegation, weightedContainment, tokenize } from '@/lib/verification/textSimilarity';

describe('textSimilarity', () => {
  describe('normalizeText', () => {
    it('should lowercase text', () => {
      expect(normalizeText('HELLO World')).toBe('hello world');
    });

    it('should strip HTML entities', () => {
      expect(normalizeText('test &amp; entity')).toBe('test entity');
      expect(normalizeText('&lt;html&gt; tags &gt;')).toBe('html tags');
    });

    it('should strip zero-width characters', () => {
      const textWithZW = 'hello\u200Bworld\u200Ctest\u200D\uFEFF';
      expect(normalizeText(textWithZW)).toBe('helloworldtest');
    });

    it('should replace punctuation with spaces', () => {
      expect(normalizeText('hello,world!')).toBe('hello world');
      expect(normalizeText('test-period.')).toBe('test period');
    });

    it('should collapse multiple spaces to one', () => {
      expect(normalizeText('hello    world')).toBe('hello world');
      expect(normalizeText('  leading  and  trailing  ')).toBe('leading and trailing');
    });

    it('should trim result', () => {
      expect(normalizeText('  hello world  ')).toBe('hello world');
      expect(normalizeText('   ')).toBe('');
    });

    it('should handle empty string', () => {
      expect(normalizeText('')).toBe('');
    });
  });

  describe('tokenizeFlat', () => {
    it('should filter words shorter than 3 chars', () => {
      const text = 'a an the cat dog runs quickly';
      const tokens = tokenizeFlat(text);

      expect(tokens.has('a')).toBe(false);
      expect(tokens.has('an')).toBe(false);
      expect(tokens.has('the')).toBe(true); // 'the' has length 3
      expect(tokens.has('cat')).toBe(true);
      expect(tokens.has('dog')).toBe(true);
      expect(tokens.has('runs')).toBe(true);
      expect(tokens.has('quickly')).toBe(true);
    });

    it('should add bigrams (adjacent word pairs)', () => {
      const text = 'the quick brown fox';
      const tokens = tokenizeFlat(text);

      expect(tokens.has('the')).toBe(true);
      expect(tokens.has('quick')).toBe(true);
      expect(tokens.has('brown')).toBe(true);
      expect(tokens.has('fox')).toBe(true);
      expect(tokens.has('the quick')).toBe(true);
      expect(tokens.has('quick brown')).toBe(true);
      expect(tokens.has('brown fox')).toBe(true);
    });

    it('should return a Set (deduplicates)', () => {
      const text = 'cat cat dog dog cat';
      const tokens = tokenizeFlat(text);

      // Words: 'cat', 'dog' (deduplicated)
      // Bigrams: 'cat cat', 'cat dog', 'dog dog', 'dog cat'
      // Total: 6 tokens
      expect(tokens.size).toBe(6);
      expect(tokens.has('cat')).toBe(true);
      expect(tokens.has('dog')).toBe(true);
      expect(tokens.has('cat cat')).toBe(true);
      expect(tokens.has('cat dog')).toBe(true);
      expect(tokens.has('dog dog')).toBe(true);
      expect(tokens.has('dog cat')).toBe(true);
    });

    it('should handle empty string → empty set', () => {
      const tokens = tokenizeFlat('');
      expect(tokens.size).toBe(0);
    });
  });

  describe('tokenize (structured)', () => {
    it('should separate unigrams and bigrams', () => {
      const { unigrams, bigrams } = tokenize('the quick brown fox');
      expect(unigrams.has('the')).toBe(true);
      expect(unigrams.has('quick')).toBe(true);
      expect(bigrams.has('the quick')).toBe(true);
      expect(bigrams.has('quick brown')).toBe(true);
      // Bigrams should NOT be in unigrams
      expect(unigrams.has('the quick')).toBe(false);
    });

    it('should handle empty string', () => {
      const { unigrams, bigrams } = tokenize('');
      expect(unigrams.size).toBe(0);
      expect(bigrams.size).toBe(0);
    });
  });

  describe('hasNegation', () => {
    it('should detect common negation words', () => {
      expect(hasNegation('The drug was not approved')).toBe(true);
      expect(hasNegation("It doesn't work")).toBe(true);
      expect(hasNegation('Never seen before')).toBe(true);
      expect(hasNegation("They won't comply")).toBe(true);
    });

    it('should return false for positive statements', () => {
      expect(hasNegation('The drug was approved by the FDA')).toBe(false);
      expect(hasNegation('It works perfectly')).toBe(false);
    });
  });

  describe('weightedContainment', () => {
    it('should return 1.0 when all claim tokens are in source', () => {
      const claim = tokenize('The Eiffel Tower was completed');
      const source = tokenize('The Eiffel Tower was completed in 1889 for the World Fair');
      expect(weightedContainment(claim, source)).toBe(1.0);
    });

    it('should return 0 when no claim tokens are in source', () => {
      const claim = tokenize('quantum computing uses qubits');
      const source = tokenize('sunny warm weather today outside');
      expect(weightedContainment(claim, source)).toBe(0);
    });

    it('should weight bigram matches higher', () => {
      // Two claims with same unigram overlap but different bigram overlap
      const source = tokenize('the quick brown fox jumps');
      const claimWithBigrams = tokenize('quick brown fox'); // shares bigrams "quick brown", "brown fox"
      const claimWithoutBigrams = tokenize('quick fox brown'); // same unigrams but no shared bigrams
      const scoreWithBigrams = weightedContainment(claimWithBigrams, source);
      const scoreWithoutBigrams = weightedContainment(claimWithoutBigrams, source);
      expect(scoreWithBigrams).toBeGreaterThan(scoreWithoutBigrams);
    });
  });

  describe('jaccardSimilarity', () => {
    it('should return 1.0 for identical sets', () => {
      const setA = new Set(['a', 'b', 'c']);
      const setB = new Set(['a', 'b', 'c']);
      expect(jaccardSimilarity(setA, setB)).toBe(1.0);
    });

    it('should return 1.0 for both empty sets', () => {
      const setA = new Set();
      const setB = new Set();
      expect(jaccardSimilarity(setA, setB)).toBe(1.0);
    });

    it('should return 0 for one empty set', () => {
      const setA = new Set(['a', 'b', 'c']);
      const setB = new Set();
      expect(jaccardSimilarity(setA, setB)).toBe(0);
      expect(jaccardSimilarity(setB, setA)).toBe(0);
    });

    it('should return 0 for disjoint sets', () => {
      const setA = new Set(['a', 'b', 'c']);
      const setB = new Set(['d', 'e', 'f']);
      expect(jaccardSimilarity(setA, setB)).toBe(0);
    });

    it('should return correct ratio for partial overlap', () => {
      const setA = new Set(['a', 'b', 'c', 'd']);
      const setB = new Set(['c', 'd', 'e', 'f']);
      // Intersection: {'c', 'd'} = 2
      // Union: {'a', 'b', 'c', 'd', 'e', 'f'} = 6
      // Jaccard = 2/6 = 0.333...
      expect(jaccardSimilarity(setA, setB)).toBeCloseTo(0.333, 3);
    });
  });

  describe('bestWindowMatch', () => {
    it('should return high score (≥ 0.4) for exact match in source', () => {
      const claim = 'The quick brown fox jumps over the lazy dog';
      const source = 'Once upon a time, the quick brown fox jumps over the lazy dog in the forest.';
      const result = bestWindowMatch(claim, source);
      
      expect(result.score).toBeGreaterThanOrEqual(0.4);
      expect(result.snippet.length).toBeLessThanOrEqual(200);
      expect(result.snippet).toContain('quick brown fox');
    });

    it('should return low score (< 0.2) for claim not in source', () => {
      const claim = 'This specific phrase does not exist in the source text';
      const source = 'A completely different piece of text about unrelated topics.';
      const result = bestWindowMatch(claim, source);
      
      expect(result.score).toBeLessThan(0.2);
    });

    it('should limit snippet length to ≤ 200 chars', () => {
      const claim = 'test';
      const source = 'A very long source text that goes on and on for many characters. '.repeat(10);
      const result = bestWindowMatch(claim, source);
      
      expect(result.snippet.length).toBeLessThanOrEqual(200);
    });

    it('should handle short source (shorter than window) correctly', () => {
      const claim = 'short test';
      const source = 'short test';
      const result = bestWindowMatch(claim, source);
      
      expect(result.score).toBeGreaterThanOrEqual(0.4);
      expect(result.snippet).toBe('short test');
    });

    it('should return { score: 0, snippet: "" } for empty claim', () => {
      const result = bestWindowMatch('', 'Some source text');
      expect(result.score).toBe(0);
      expect(result.snippet).toBe('');
    });
  });

  describe('score ranges for 80% threshold evaluation', () => {
    it('near-identical text scores >= 0.7', () => {
      const claim = 'The quick brown fox jumps over the lazy dog';
      const source = 'The quick brown fox jumps over the lazy dog.';
      const { score } = bestWindowMatch(claim, source);
      expect(score).toBeGreaterThanOrEqual(0.7);
    });

    it('verbatim quote in longer source scores >= 0.5', () => {
      const claim = 'TypeScript is a typed superset of JavaScript';
      const source =
        'Programming languages have evolved significantly. TypeScript is a typed superset of JavaScript that compiles to plain JavaScript. It was developed by Microsoft and first released in 2012.';
      const { score } = bestWindowMatch(claim, source);
      expect(score).toBeGreaterThanOrEqual(0.5);
    });

    it('paraphrased content typically scores 0.1–0.5', () => {
      const claim =
        'The sky appears blue because of how sunlight scatters in the atmosphere';
      const source =
        'Rayleigh scattering causes shorter wavelengths of light, particularly blue, to scatter more than other colors when sunlight enters the atmosphere. This phenomenon explains the blue appearance of the sky during the day.';
      const { score } = bestWindowMatch(claim, source);
      expect(score).toBeGreaterThan(0.1);
      expect(score).toBeLessThan(0.7);
    });

    it('unrelated text scores < 0.15', () => {
      const claim = 'The stock market closed higher today';
      const source =
        'Photosynthesis is the process by which green plants convert sunlight into chemical energy stored in glucose molecules.';
      const { score } = bestWindowMatch(claim, source);
      expect(score).toBeLessThan(0.15);
    });
  });

  describe('containmentScore', () => {
    it('returns 1.0 when all claim tokens are in source', () => {
      const claim = tokenizeFlat('The Eiffel Tower was completed in 1889');
      const source = tokenizeFlat('The Eiffel Tower was completed in 1889 for the World Fair in Paris');
      expect(containmentScore(claim, source)).toBe(1.0);
    });

    it('returns 0 when no claim tokens are in source', () => {
      const claim = tokenizeFlat('quantum computing uses qubits');
      const source = tokenizeFlat('The weather today was sunny and warm');
      expect(containmentScore(claim, source)).toBe(0);
    });

    it('returns partial score for partial overlap', () => {
      const claim = tokenizeFlat('The Eiffel Tower is an iconic Parisian landmark');
      const source = tokenizeFlat('The Eiffel Tower was completed in 1889 for the World Fair');
      const score = containmentScore(claim, source);
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThan(1);
    });

    it('returns 0 for empty claim tokens', () => {
      const claim = new Set<string>();
      const source = tokenizeFlat('some text here');
      expect(containmentScore(claim, source)).toBe(0);
    });
  });

  describe('short source content (SearXNG snippets)', () => {
    it('paraphrased claim vs short snippet scores above 0.08 with containment boost', () => {
      // Realistic: SearXNG returns a ~150 char snippet, LLM paraphrases it
      const claim = 'Completed in 1889 for the World Fair, the Eiffel Tower has become an iconic Parisian landmark';
      const source = 'The Eiffel Tower was completed in 1889 for the World\'s Fair in Paris, France.';
      const { score } = bestWindowMatch(claim, source);
      // With containment boost, shared keywords (Eiffel, Tower, completed, 1889, Fair, Paris)
      // should push this above the weak threshold
      expect(score).toBeGreaterThan(0.08);
    });

    it('related claim vs short snippet scores higher than pure Jaccard', () => {
      const claim = 'Tesla reported record quarterly revenue of $25.2 billion in Q4 2024';
      const source = 'Tesla Q4 2024 revenue reached $25.2 billion, a new quarterly record for the company.';
      const { score } = bestWindowMatch(claim, source);
      // Many shared keywords: Tesla, Q4, 2024, revenue, 25.2, billion, quarterly, record
      expect(score).toBeGreaterThan(0.15);
    });

    it('completely unrelated claim vs short snippet still scores low', () => {
      const claim = 'The GDP of France grew by 2.1% in 2024';
      const source = 'Apple released the new iPhone 16 with improved camera capabilities.';
      const { score } = bestWindowMatch(claim, source);
      expect(score).toBeLessThan(0.08);
    });
  });
});