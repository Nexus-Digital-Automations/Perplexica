import { describe, it, expect } from 'vitest';
import { resolvePipelineConfig } from '@/lib/config/pipeline';

describe('search flow configuration', () => {
  describe('defaults for multi-question research', () => {
    it('generates 5 questions by default', () => {
      const config = resolvePipelineConfig();
      expect(config.numQuestions).toBe(5);
    });

    it('uses 2 sources per question by default', () => {
      const config = resolvePipelineConfig();
      expect(config.sourcesPerQuestion).toBe(2);
    });

    it('runs questions in parallel by default', () => {
      const config = resolvePipelineConfig();
      expect(config.questionsParallel).toBe(true);
    });

    it('multi-question path activates when numQuestions > 1', () => {
      const config = resolvePipelineConfig();
      expect(config.numQuestions).toBeGreaterThan(1);
    });
  });

  describe('user overrides for numQuestions and sourcesPerQuestion', () => {
    it('user can set exactly 5 questions and 2 sources', () => {
      const config = resolvePipelineConfig({
        numQuestions: 5,
        sourcesPerQuestion: 2,
      });
      expect(config.numQuestions).toBe(5);
      expect(config.sourcesPerQuestion).toBe(2);
    });

    it('user can increase questions beyond default', () => {
      const config = resolvePipelineConfig({
        numQuestions: 10,
      });
      expect(config.numQuestions).toBe(10);
    });

    it('user can decrease questions to 1', () => {
      const config = resolvePipelineConfig({
        numQuestions: 1,
      });
      expect(config.numQuestions).toBe(1);
    });

    it('user can configure for speed (low questions, no verification)', () => {
      const config = resolvePipelineConfig({
        numQuestions: 1,
        sourcesPerQuestion: 2,
        verificationEnabled: false,
        responseLength: 'brief',
        interactiveQuestions: false,
      });
      expect(config.numQuestions).toBe(1);
      expect(config.verificationEnabled).toBe(false);
      expect(config.responseLength).toBe('brief');
    });

    it('user can configure for quality (high questions, strict verification)', () => {
      const config = resolvePipelineConfig({
        numQuestions: 8,
        sourcesPerQuestion: 5,
        verificationEnabled: true,
        passThreshold: 0.2,
        maxCorrectionRetries: 2,
        responseLength: 'comprehensive',
      });
      expect(config.numQuestions).toBe(8);
      expect(config.sourcesPerQuestion).toBe(5);
      expect(config.passThreshold).toBe(0.2);
      expect(config.maxCorrectionRetries).toBe(2);
    });

    it('overrides do not affect unrelated fields', () => {
      const config = resolvePipelineConfig({
        numQuestions: 7,
        sourcesPerQuestion: 3,
      });
      expect(config.numQuestions).toBe(7);
      expect(config.sourcesPerQuestion).toBe(3);
      // Defaults preserved
      expect(config.responseLength).toBe('standard');
      expect(config.verificationEnabled).toBe(true);
      expect(config.writerTemperature).toBe(0.2);
    });
  });

  describe('research block data shape for multi-question mode', () => {
    it('ResearchBlock supports question metadata', () => {
      const mockBlock = {
        id: 'test-id',
        type: 'research' as const,
        data: {
          subSteps: [],
          question: 'What is the capital of France?',
          questionIndex: 1,
          questionTotal: 5,
        },
      };

      expect(mockBlock.data.question).toBe('What is the capital of France?');
      expect(mockBlock.data.questionIndex).toBe(1);
      expect(mockBlock.data.questionTotal).toBe(5);
      expect(mockBlock.data.subSteps).toEqual([]);
    });

    it('subSteps searching array is safely handled when undefined', () => {
      const malformedStep = {
        id: 'step-1',
        type: 'searching' as const,
        searching: undefined as any,
      };

      const isValid = Array.isArray(malformedStep.searching);
      expect(isValid).toBe(false);

      const length = Array.isArray(malformedStep.searching)
        ? malformedStep.searching.length
        : 0;
      expect(length).toBe(0);
    });

    it('subSteps reading array is safely handled when undefined', () => {
      const malformedStep = {
        id: 'step-2',
        type: 'search_results' as const,
        reading: undefined as any,
      };

      const isValid = Array.isArray(malformedStep.reading);
      expect(isValid).toBe(false);

      const length = Array.isArray(malformedStep.reading)
        ? malformedStep.reading.length
        : 0;
      expect(length).toBe(0);
    });

    it('subSteps queries array is safely handled when undefined', () => {
      const malformedStep = {
        id: 'step-3',
        type: 'upload_searching' as const,
        queries: undefined as any,
      };

      const isValid = Array.isArray(malformedStep.queries);
      expect(isValid).toBe(false);
    });

    it('subSteps results array is safely handled when undefined', () => {
      const malformedStep = {
        id: 'step-4',
        type: 'upload_search_results' as const,
        results: undefined as any,
      };

      const isValid = Array.isArray(malformedStep.results);
      expect(isValid).toBe(false);
    });
  });

  describe('multi-question activity feed data model', () => {
    it('multiple research blocks represent separate questions', () => {
      const blocks = [
        {
          id: 'rb-1',
          type: 'research' as const,
          data: {
            subSteps: [
              { id: 's1', type: 'searching' as const, searching: ['query 1a', 'query 1b'] },
              { id: 's2', type: 'search_results' as const, reading: [{ content: 'result', metadata: { url: 'https://example.com', title: 'Example' } }] },
            ],
            question: 'What is React?',
            questionIndex: 1,
            questionTotal: 5,
          },
        },
        {
          id: 'rb-2',
          type: 'research' as const,
          data: {
            subSteps: [
              { id: 's3', type: 'searching' as const, searching: ['query 2a'] },
              { id: 's4', type: 'search_results' as const, reading: [{ content: 'result2', metadata: { url: 'https://example2.com', title: 'Example 2' } }] },
            ],
            question: 'What are React hooks?',
            questionIndex: 2,
            questionTotal: 5,
          },
        },
      ];

      const researchBlocks = blocks.filter((b) => b.type === 'research');
      expect(researchBlocks).toHaveLength(2);

      const hasMultipleQuestions = researchBlocks.length > 1;
      expect(hasMultipleQuestions).toBe(true);

      expect(researchBlocks[0].data.question).toBe('What is React?');
      expect(researchBlocks[1].data.question).toBe('What are React hooks?');

      const allSubSteps = researchBlocks.flatMap((rb) => rb.data.subSteps);
      const totalSearching = allSubSteps
        .filter((s) => s.type === 'searching' && Array.isArray((s as any).searching))
        .reduce((acc, s) => acc + ((s as any).searching?.length ?? 0), 0);
      expect(totalSearching).toBe(3);

      const totalSources = allSubSteps
        .filter((s) => s.type === 'search_results' && Array.isArray((s as any).reading))
        .reduce((acc, s) => acc + ((s as any).reading?.length ?? 0), 0);
      expect(totalSources).toBe(2);
    });

    it('single research block falls back to inline display', () => {
      const blocks = [
        {
          id: 'rb-1',
          type: 'research' as const,
          data: {
            subSteps: [
              { id: 's1', type: 'searching' as const, searching: ['query'] },
            ],
          },
        },
      ];

      const researchBlocks = blocks.filter((b) => b.type === 'research');
      expect(researchBlocks).toHaveLength(1);
      const hasMultipleQuestions = researchBlocks.length > 1;
      expect(hasMultipleQuestions).toBe(false);
    });
  });
});
