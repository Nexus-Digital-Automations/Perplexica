import { describe, it, expect } from 'vitest';
import {
  resolvePipelineConfig,
  toVerificationConfig,
  PIPELINE_DEFAULTS,
  type PipelineConfig,
} from '@/lib/config/pipeline';

describe('pipeline config', () => {
  describe('resolvePipelineConfig', () => {
    it('returns defaults when no overrides provided', () => {
      const config = resolvePipelineConfig();
      expect(config).toEqual(PIPELINE_DEFAULTS);
    });

    it('returns defaults with explicit undefined', () => {
      const config = resolvePipelineConfig(undefined);
      expect(config).toEqual(PIPELINE_DEFAULTS);
    });

    it('returns correct default values', () => {
      const config = resolvePipelineConfig();
      expect(config.sourcesPerQuestion).toBe(2);
      expect(config.responseLength).toBe('standard');
      expect(config.writerTemperature).toBe(0.2);
      expect(config.verificationEnabled).toBe(true);
      expect(config.passThreshold).toBe(0.30);
      expect(config.weakThreshold).toBe(0.18);
      expect(config.maxCorrectionRetries).toBe(1);
      expect(config.correctionTimeoutMs).toBe(12000);
      expect(config.correctionTemperature).toBe(0.1);
      expect(config.numQuestions).toBe(5);
      expect(config.questionsParallel).toBe(true);
      expect(config.budgetUsd).toBe(null);
      expect(config.interactiveQuestions).toBe(true);
    });

    it('overrides apply correctly', () => {
      const overrides = {
        sourcesPerQuestion: 10,
        verificationEnabled: false,
        budgetUsd: 5.0,
      };
      const config = resolvePipelineConfig(overrides);
      expect(config.sourcesPerQuestion).toBe(10);
      expect(config.verificationEnabled).toBe(false);
      expect(config.budgetUsd).toBe(5.0);
      // Other values remain defaults
      expect(config.responseLength).toBe('standard');
      expect(config.writerTemperature).toBe(0.2);
    });

    it('overrides can be partial', () => {
      const overrides = { budgetUsd: 1.0 };
      const config = resolvePipelineConfig(overrides);
      expect(config.budgetUsd).toBe(1.0);
      expect(config.sourcesPerQuestion).toBe(2);
      expect(config.verificationEnabled).toBe(true);
    });

    it('overrides can set writerTemperature', () => {
      const config = resolvePipelineConfig({ writerTemperature: 0.8 });
      expect(config.writerTemperature).toBe(0.8);
    });

    it('overrides can set responseLength', () => {
      const config = resolvePipelineConfig({ responseLength: 'comprehensive' });
      expect(config.responseLength).toBe('comprehensive');
    });
  });

  describe('toVerificationConfig', () => {
    it('converts pipeline config to verification config', () => {
      const resolved: PipelineConfig = {
        sourcesPerQuestion: 2,
        responseLength: 'standard',
        writerTemperature: 0.2,
        verificationEnabled: true,
        passThreshold: 0.15,
        weakThreshold: 0.08,
        maxCorrectionRetries: 0,
        correctionTimeoutMs: 12000,
        correctionTemperature: 0.1,
        numQuestions: 5,
        questionsParallel: true,
        budgetUsd: null,
        interactiveQuestions: true,
      };

      const verificationConfig = toVerificationConfig(resolved);
      expect(verificationConfig).toEqual({
        enabled: true,
        passThreshold: 0.15,
        weakThreshold: 0.08,
        maxCorrectionRetries: 0,
        correctionTimeoutMs: 12000,
        writerTemperature: 0.2,
        correctionTemperature: 0.1,
      });
    });

    it('verification disabled → enabled: false', () => {
      const resolved = resolvePipelineConfig({ verificationEnabled: false });
      const verificationConfig = toVerificationConfig(resolved);
      expect(verificationConfig.enabled).toBe(false);
    });

    it('does not include mode field', () => {
      const resolved = resolvePipelineConfig();
      const verificationConfig = toVerificationConfig(resolved);
      expect('mode' in verificationConfig).toBe(false);
    });
  });
});
