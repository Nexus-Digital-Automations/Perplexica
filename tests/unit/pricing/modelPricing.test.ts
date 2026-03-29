import { describe, it, expect } from 'vitest';
import { calculateCost } from '@/lib/pricing/modelPricing';

describe('modelPricing', () => {
  describe('calculateCost', () => {
    it('gpt-4o → correct cost', () => {
      const usage = { prompt_tokens: 1000, completion_tokens: 500 };
      const cost = calculateCost(usage, 'gpt-4o');
      // Input: $2.5 per 1M tokens → 1000 * 2.5 / 1,000,000 = $0.0025
      // Output: $10.0 per 1M tokens → 500 * 10.0 / 1,000,000 = $0.005
      // Total: $0.0075
      expect(cost).toBeCloseTo(0.0075, 6);
    });

    it('gpt-4o-mini → correct cost', () => {
      const usage = { prompt_tokens: 2000, completion_tokens: 1000 };
      const cost = calculateCost(usage, 'gpt-4o-mini');
      // Input: $0.15 per 1M tokens → 2000 * 0.15 / 1,000,000 = $0.0003
      // Output: $0.6 per 1M tokens → 1000 * 0.6 / 1,000,000 = $0.0006
      // Total: $0.0009
      expect(cost).toBeCloseTo(0.0009, 6);
    });

    it('claude-3-5-sonnet-20241022 → correct cost', () => {
      const usage = { prompt_tokens: 500, completion_tokens: 250 };
      const cost = calculateCost(usage, 'claude-3-5-sonnet-20241022');
      // Input: $3.0 per 1M tokens → 500 * 3.0 / 1,000,000 = $0.0015
      // Output: $15.0 per 1M tokens → 250 * 15.0 / 1,000,000 = $0.00375
      // Total: $0.00525
      expect(cost).toBeCloseTo(0.00525, 6);
    });

    it('gemini-1.5-flash → correct cost', () => {
      const usage = { prompt_tokens: 10000, completion_tokens: 5000 };
      const cost = calculateCost(usage, 'gemini-1.5-flash');
      // Input: $0.075 per 1M tokens → 10000 * 0.075 / 1,000,000 = $0.00075
      // Output: $0.3 per 1M tokens → 5000 * 0.3 / 1,000,000 = $0.0015
      // Total: $0.00225
      expect(cost).toBeCloseTo(0.00225, 6);
    });

    it('llama-3.3-70b-versatile → correct cost', () => {
      const usage = { prompt_tokens: 1500, completion_tokens: 800 };
      const cost = calculateCost(usage, 'llama-3.3-70b-versatile');
      // Input: $0.59 per 1M tokens → 1500 * 0.59 / 1,000,000 = $0.000885
      // Output: $0.79 per 1M tokens → 800 * 0.79 / 1,000,000 = $0.000632
      // Total: $0.001517
      expect(cost).toBeCloseTo(0.001517, 6);
    });

    it('model with version suffix matches base model pricing', () => {
      const usage = { prompt_tokens: 1000, completion_tokens: 500 };
      const cost = calculateCost(usage, 'gpt-4o-2024-08-06');
      // Should match gpt-4o pricing
      expect(cost).toBeCloseTo(0.0075, 6);
    });

    it('unknown model → null', () => {
      const usage = { prompt_tokens: 1000, completion_tokens: 500 };
      const cost = calculateCost(usage, 'unknown-model-xyz');
      expect(cost).toBeNull();
    });

    it('null usage → null', () => {
      const cost = calculateCost(null, 'gpt-4o');
      expect(cost).toBeNull();
    });

    it('undefined usage → null', () => {
      const cost = calculateCost(undefined, 'gpt-4o');
      expect(cost).toBeNull();
    });

    it('zero tokens → zero cost', () => {
      const usage = { prompt_tokens: 0, completion_tokens: 0 };
      const cost = calculateCost(usage, 'gpt-4o');
      expect(cost).toBe(0);
    });

    it('large token counts → correct scaling', () => {
      const usage = { prompt_tokens: 1_000_000, completion_tokens: 500_000 };
      const cost = calculateCost(usage, 'gpt-4o-mini');
      // Input: 1M * $0.15 = $0.15
      // Output: 0.5M * $0.6 = $0.3
      // Total: $0.45
      expect(cost).toBeCloseTo(0.45, 6);
    });

    it('mixtral-8x7b-32768 (same input/output price)', () => {
      const usage = { prompt_tokens: 1000, completion_tokens: 1000 };
      const cost = calculateCost(usage, 'mixtral-8x7b-32768');
      // Both input and output: $0.24 per 1M tokens
      // 2000 * 0.24 / 1,000,000 = $0.00048
      expect(cost).toBeCloseTo(0.00048, 6);
    });
  });
});