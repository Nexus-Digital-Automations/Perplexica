import { describe, it, expect } from 'vitest';
import computeSimilarity from '@/lib/utils/computeSimilarity';

describe('computeSimilarity', () => {
  it('should compute cosine similarity for identical vectors', () => {
    const vectorA = [1, 2, 3];
    const vectorB = [1, 2, 3];
    
    const similarity = computeSimilarity(vectorA, vectorB);
    expect(similarity).toBeCloseTo(1.0, 5); // Cosine similarity of identical vectors is 1
  });

  it('should compute cosine similarity for orthogonal vectors', () => {
    const vectorA = [1, 0, 0];
    const vectorB = [0, 1, 0];
    
    const similarity = computeSimilarity(vectorA, vectorB);
    expect(similarity).toBeCloseTo(0.0, 5); // Cosine similarity of orthogonal vectors is 0
  });

  it('should compute cosine similarity for opposite vectors', () => {
    const vectorA = [1, 2, 3];
    const vectorB = [-1, -2, -3];
    
    const similarity = computeSimilarity(vectorA, vectorB);
    expect(similarity).toBeCloseTo(-1.0, 5); // Cosine similarity of opposite vectors is -1
  });

  it('should compute cosine similarity for partially similar vectors', () => {
    const vectorA = [1, 2, 3];
    const vectorB = [2, 4, 6]; // vectorB = 2 * vectorA
    
    const similarity = computeSimilarity(vectorA, vectorB);
    expect(similarity).toBeCloseTo(1.0, 5); // Cosine similarity ignores magnitude
  });

  it('should compute cosine similarity for different vectors', () => {
    const vectorA = [1, 2, 3];
    const vectorB = [4, 5, 6];
    
    const similarity = computeSimilarity(vectorA, vectorB);
    // Expected value: dot = 1*4 + 2*5 + 3*6 = 4 + 10 + 18 = 32
    // normA = 1 + 4 + 9 = 14, sqrt = √14 ≈ 3.741657
    // normB = 16 + 25 + 36 = 77, sqrt = √77 ≈ 8.774964
    // similarity = 32 / (3.741657 * 8.774964) ≈ 32 / 32.832 ≈ 0.9746
    expect(similarity).toBeCloseTo(0.9746, 4);
  });

  it('should return 0 for zero vectors', () => {
    const vectorA = [0, 0, 0];
    const vectorB = [1, 2, 3];
    
    const similarity = computeSimilarity(vectorA, vectorB);
    expect(similarity).toBe(0);
  });

  it('should return 0 when both vectors are zero', () => {
    const vectorA = [0, 0, 0];
    const vectorB = [0, 0, 0];
    
    const similarity = computeSimilarity(vectorA, vectorB);
    expect(similarity).toBe(0);
  });

  it('should handle single-element vectors', () => {
    const vectorA = [5];
    const vectorB = [3];
    
    const similarity = computeSimilarity(vectorA, vectorB);
    // dot = 5*3 = 15, normA = 25, normB = 9
    // similarity = 15 / (5 * 3) = 15 / 15 = 1
    expect(similarity).toBeCloseTo(1.0, 5);
  });

  it('should handle negative values', () => {
    const vectorA = [-1, -2, -3];
    const vectorB = [-4, -5, -6];
    
    const similarity = computeSimilarity(vectorA, vectorB);
    // dot = (-1)*(-4) + (-2)*(-5) + (-3)*(-6) = 4 + 10 + 18 = 32
    // normA = 1 + 4 + 9 = 14, normB = 16 + 25 + 36 = 77
    // similarity = 32 / (√14 * √77) ≈ 0.9746 (same as positive case)
    expect(similarity).toBeCloseTo(0.9746, 4);
  });

  it('should handle mixed positive and negative values', () => {
    const vectorA = [1, -2, 3];
    const vectorB = [-4, 5, -6];
    
    const similarity = computeSimilarity(vectorA, vectorB);
    // dot = 1*(-4) + (-2)*5 + 3*(-6) = -4 - 10 - 18 = -32
    // normA = 1 + 4 + 9 = 14, normB = 16 + 25 + 36 = 77
    // similarity = -32 / (√14 * √77) ≈ -0.9746
    expect(similarity).toBeCloseTo(-0.9746, 4);
  });

  it('should throw error for vectors of different lengths', () => {
    const vectorA = [1, 2, 3];
    const vectorB = [1, 2];
    
    expect(() => computeSimilarity(vectorA, vectorB)).toThrow(
      'Vectors must be of the same length'
    );
  });

  it('should handle empty vectors', () => {
    const vectorA: number[] = [];
    const vectorB: number[] = [];
    
    const similarity = computeSimilarity(vectorA, vectorB);
    expect(similarity).toBe(0);
  });

  it('should handle floating point vectors', () => {
    const vectorA = [0.1, 0.2, 0.3];
    const vectorB = [0.4, 0.5, 0.6];
    
    const similarity = computeSimilarity(vectorA, vectorB);
    // dot = 0.1*0.4 + 0.2*0.5 + 0.3*0.6 = 0.04 + 0.10 + 0.18 = 0.32
    // normA = 0.01 + 0.04 + 0.09 = 0.14, sqrt = √0.14 ≈ 0.3741657
    // normB = 0.16 + 0.25 + 0.36 = 0.77, sqrt = √0.77 ≈ 0.8774964
    // similarity = 0.32 / (0.3741657 * 0.8774964) ≈ 0.32 / 0.32832 ≈ 0.9746
    expect(similarity).toBeCloseTo(0.9746, 4);
  });
});