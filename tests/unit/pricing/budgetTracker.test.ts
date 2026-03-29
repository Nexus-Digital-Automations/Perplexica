import { describe, it, expect } from 'vitest';
import { BudgetTracker } from '@/lib/pricing/budgetTracker';

describe('BudgetTracker', () => {
  describe('with limit', () => {
    it('starts with zero spent', () => {
      const tracker = new BudgetTracker(10.0);
      expect(tracker.spent).toBe(0);
      expect(tracker.limit).toBe(10.0);
      expect(tracker.remaining).toBe(10.0);
      expect(tracker.hasExceeded()).toBe(false);
    });

    it('records cost and updates spent', () => {
      const tracker = new BudgetTracker(10.0);
      tracker.record(2.5);
      expect(tracker.spent).toBe(2.5);
      expect(tracker.remaining).toBe(7.5);
      expect(tracker.hasExceeded()).toBe(false);
    });

    it('multiple records accumulate', () => {
      const tracker = new BudgetTracker(10.0);
      tracker.record(2.5);
      tracker.record(1.0);
      tracker.record(0.5);
      expect(tracker.spent).toBe(4.0);
      expect(tracker.remaining).toBe(6.0);
    });

    it('exact limit → hasExceeded() returns true', () => {
      const tracker = new BudgetTracker(5.0);
      tracker.record(5.0);
      expect(tracker.spent).toBe(5.0);
      expect(tracker.remaining).toBe(0);
      expect(tracker.hasExceeded()).toBe(true);
    });

    it('over limit → hasExceeded() returns true', () => {
      const tracker = new BudgetTracker(5.0);
      tracker.record(6.0);
      expect(tracker.spent).toBe(6.0);
      expect(tracker.remaining).toBe(0); // Never negative
      expect(tracker.hasExceeded()).toBe(true);
    });

    it('remaining never negative', () => {
      const tracker = new BudgetTracker(5.0);
      tracker.record(10.0);
      expect(tracker.remaining).toBe(0);
    });

    it('handles fractional costs', () => {
      const tracker = new BudgetTracker(1.0);
      tracker.record(0.25);
      tracker.record(0.125);
      expect(tracker.spent).toBeCloseTo(0.375, 6);
      expect(tracker.remaining).toBeCloseTo(0.625, 6);
    });
  });

  describe('without limit (null)', () => {
    it('spent tracks normally', () => {
      const tracker = new BudgetTracker(null);
      tracker.record(5.0);
      tracker.record(2.5);
      expect(tracker.spent).toBe(7.5);
      expect(tracker.limit).toBe(null);
      expect(tracker.remaining).toBe(null);
      expect(tracker.hasExceeded()).toBe(false);
    });

    it('hasExceeded() always returns false', () => {
      const tracker = new BudgetTracker(null);
      tracker.record(1000.0);
      expect(tracker.hasExceeded()).toBe(false);
    });

    it('remaining is null', () => {
      const tracker = new BudgetTracker(null);
      tracker.record(5.0);
      expect(tracker.remaining).toBe(null);
    });
  });

  describe('edge cases', () => {
    it('zero limit → immediately exceeded', () => {
      const tracker = new BudgetTracker(0);
      expect(tracker.hasExceeded()).toBe(true);
      tracker.record(0.01);
      expect(tracker.hasExceeded()).toBe(true);
      expect(tracker.remaining).toBe(0);
    });

    it('negative cost not allowed (but method doesn\'t prevent it)', () => {
      const tracker = new BudgetTracker(10.0);
      tracker.record(-2.0);
      expect(tracker.spent).toBe(-2.0);
      expect(tracker.remaining).toBe(12.0); // Limit - (-2) = 12
      expect(tracker.hasExceeded()).toBe(false);
    });

    it('very small limit and cost', () => {
      const tracker = new BudgetTracker(0.001);
      tracker.record(0.0005);
      expect(tracker.spent).toBe(0.0005);
      expect(tracker.remaining).toBeCloseTo(0.0005, 6);
      expect(tracker.hasExceeded()).toBe(false);
      
      tracker.record(0.0006);
      expect(tracker.hasExceeded()).toBe(true);
      expect(tracker.remaining).toBe(0);
    });
  });
});