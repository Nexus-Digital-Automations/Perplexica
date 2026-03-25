import type { VerificationConfig } from '@/lib/verification/types';

export type ResponseLength = 'brief' | 'standard' | 'comprehensive';

export type PipelineConfig = {
  sourcesPerQuestion: number;
  responseLength: ResponseLength;
  writerTemperature: number;
  verificationEnabled: boolean;
  passThreshold: number;
  verbatimPassThreshold: number;
  weakThreshold: number;
  maxCorrectionRetries: number;
  correctionTimeoutMs: number;
  correctionTemperature: number;
  numQuestions: number;
  questionsParallel: boolean;
  budgetUsd: number | null;
  interactiveQuestions: boolean;
  credibilityThresholdAdjustment: number;
};

export type PipelineOverrides = Partial<PipelineConfig>;

const DEFAULTS: PipelineConfig = {
  sourcesPerQuestion: 2,
  responseLength: 'standard',
  writerTemperature: 0.2,
  verificationEnabled: true,
  passThreshold: 0.30,
  verbatimPassThreshold: 0.50,
  weakThreshold: 0.18,
  maxCorrectionRetries: 1,
  correctionTimeoutMs: 12000,
  correctionTemperature: 0.1,
  numQuestions: 5,
  questionsParallel: true,
  budgetUsd: null,
  interactiveQuestions: true,
  credibilityThresholdAdjustment: 0.03,
};

export { DEFAULTS as PIPELINE_DEFAULTS };

export function resolvePipelineConfig(
  overrides?: PipelineOverrides,
): PipelineConfig {
  return { ...DEFAULTS, ...overrides };
}

export function toVerificationConfig(
  resolved: PipelineConfig,
): VerificationConfig {
  return {
    enabled: resolved.verificationEnabled,
    passThreshold: resolved.passThreshold,
    verbatimPassThreshold: resolved.verbatimPassThreshold,
    weakThreshold: resolved.weakThreshold,
    maxCorrectionRetries: resolved.maxCorrectionRetries,
    correctionTimeoutMs: resolved.correctionTimeoutMs,
    writerTemperature: resolved.writerTemperature,
    correctionTemperature: resolved.correctionTemperature,
    credibilityThresholdAdjustment: resolved.credibilityThresholdAdjustment,
  };
}

export const PIPELINE_OVERRIDES_LS_KEY = 'perplexica_pipeline_overrides';
