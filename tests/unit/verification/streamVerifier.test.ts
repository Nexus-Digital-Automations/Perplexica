import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Chunk, TextBlock } from '@/lib/types';
import { GenerateTextInput } from '@/lib/models/types';
import { VerificationConfig } from '@/lib/verification/types';

describe('streamVerifier', () => {
  let mockSession: any;
  let mockLLM: any;
  let mockSources: Chunk[];
  let mockConfig: VerificationConfig;
  let mockStreamInput: GenerateTextInput;
  let mockVerifyCitations: any;
  let mockCorrectFailedCitations: any;

  beforeEach(async () => {
    // Mock the dependencies using doMock (not hoisted)
    mockVerifyCitations = vi.fn();
    mockCorrectFailedCitations = vi.fn();
    
    vi.doMock('@/lib/verification/verifier', () => ({
      verifyCitations: mockVerifyCitations,
      correctFailedCitations: mockCorrectFailedCitations,
    }));

    // Create mock async generator for streamText
    const mockStreamGenerator = async function* () {
      yield { contentChunk: 'Hello ', additionalInfo: { usage: { prompt_tokens: 10, completion_tokens: 2 } } };
      yield { contentChunk: 'world!', additionalInfo: { usage: { prompt_tokens: 10, completion_tokens: 4 } } };
    };

    // Setup mock LLM
    mockLLM = {
      streamText: vi.fn().mockImplementation(mockStreamGenerator),
    };

    // Setup mock session
    mockSession = {
      emitBlock: vi.fn(),
      getBlock: vi.fn().mockReturnValue({ id: 'test-block', type: 'text', data: 'Hello ' }),
      updateBlock: vi.fn(),
      emit: vi.fn(),
    };

    // Setup test data
    mockSources = [
      {
        id: 'source1',
        content: 'Hello world is a common programming example.',
        metadata: { url: 'http://example.com' },
      },
    ];

    mockConfig = {
      enabled: true,
      writerTemperature: 0.7,
      verifierTemperature: 0.3,
      similarityThreshold: 0.4,
      windowMultiplier: 2,
      maxCorrectionAttempts: 2,
    };

    mockStreamInput = {
      prompt: 'Say hello world',
      systemPrompt: 'You are a helpful assistant',
      model: 'test-model',
    };

    // Clear all mocks
    vi.clearAllMocks();
  });

  describe('streamWithVerification', () => {
    it('should handle successful stream with verification', async () => {
      // Mock verification to pass
      mockVerifyCitations.mockReturnValue({
        totalCitations: 1,
        passed: 1,
        weak: 0,
        failed: 0,
        results: [{ citationIndex: 1, sentence: 'Hello world', similarity: 0.8, status: 'pass', matchedSnippet: 'Hello world' }],
        wasCorrected: false,
      });

      // Import the module under test AFTER setting up mocks
      const { streamWithVerification } = await import('@/lib/verification/streamVerifier');

      const result = await streamWithVerification({
        session: mockSession,
        llm: mockLLM,
        streamInput: mockStreamInput,
        sources: mockSources,
        config: mockConfig,
        emitMode: 'blocks',
      });

      // Verify LLM was called with correct temperature
      expect(mockLLM.streamText).toHaveBeenCalledWith({
        ...mockStreamInput,
        options: {
          ...mockStreamInput.options,
          temperature: mockConfig.writerTemperature,
        },
      });

      // Verify verification was called
      expect(mockVerifyCitations).toHaveBeenCalledWith(
        'Hello world!',
        mockSources,
        mockConfig
      );

      // Verify session emitted blocks
      expect(mockSession.emitBlock).toHaveBeenCalled();
      expect(mockSession.updateBlock).toHaveBeenCalled();

      // Verify usage was captured
      expect(result.usage).toEqual({ prompt_tokens: 10, completion_tokens: 4 });
    });

    it('should handle verification disabled', async () => {
      const disabledConfig = { ...mockConfig, enabled: false };

      // Import the module under test AFTER setting up mocks
      const { streamWithVerification } = await import('@/lib/verification/streamVerifier');

      const result = await streamWithVerification({
        session: mockSession,
        llm: mockLLM,
        streamInput: mockStreamInput,
        sources: mockSources,
        config: disabledConfig,
        emitMode: 'blocks',
      });

      // Verify LLM was called without temperature override
      expect(mockLLM.streamText).toHaveBeenCalledWith({
        ...mockStreamInput,
        options: {},
      });

      // Verify verification was NOT called
      expect(mockVerifyCitations).not.toHaveBeenCalled();

      // Verify session emitted blocks
      expect(mockSession.emitBlock).toHaveBeenCalled();
      expect(result.usage).toBeDefined();
    });

    it('should handle empty sources', async () => {
      // Import the module under test AFTER setting up mocks
      const { streamWithVerification } = await import('@/lib/verification/streamVerifier');

      const result = await streamWithVerification({
        session: mockSession,
        llm: mockLLM,
        streamInput: mockStreamInput,
        sources: [],
        config: mockConfig,
        emitMode: 'blocks',
      });

      // Verify LLM was called with temperature override (verification enabled but no sources)
      expect(mockLLM.streamText).toHaveBeenCalledWith({
        ...mockStreamInput,
        options: {
          temperature: mockConfig.writerTemperature,
        },
      });

      // Verify verification was NOT called (no sources to verify against)
      expect(mockVerifyCitations).not.toHaveBeenCalled();

      // Verify session emitted blocks
      expect(mockSession.emitBlock).toHaveBeenCalled();
      expect(result.usage).toBeDefined();
    });

    it('should handle stream errors', async () => {
      // Mock stream to throw error
      mockLLM.streamText = vi.fn(async function* () {
        throw new Error('Stream error');
      });

      // Import the module under test AFTER setting up mocks
      const { streamWithVerification } = await import('@/lib/verification/streamVerifier');

      await expect(
        streamWithVerification({
          session: mockSession,
          llm: mockLLM,
          streamInput: mockStreamInput,
          sources: mockSources,
          config: mockConfig,
          emitMode: 'blocks',
        })
      ).rejects.toThrow('Stream error');
    });
  });
});