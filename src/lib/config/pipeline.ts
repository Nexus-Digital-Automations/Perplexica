import type { VerificationConfig } from '@/lib/verification/types';

export type ResponseLength = 'brief' | 'standard' | 'comprehensive';
export type OptimizationMode = 'speed' | 'balanced' | 'quality';

export type ResolvedPipelineConfig = {
  mode: OptimizationMode;
  maxIterations: number;
  responseLength: ResponseLength;
  writerTemperature: number;
  verificationEnabled: boolean;
  passThreshold: number;
  weakThreshold: number;
  maxCorrectionRetries: number;
  correctionTimeoutMs: number;
  correctionTemperature: number;
};

export type PipelineOverrides = Partial<Omit<ResolvedPipelineConfig, 'mode'>>;

const MODE_DEFAULTS: Record<OptimizationMode, Omit<ResolvedPipelineConfig, 'mode'>> = {
  speed: {
    maxIterations: 2,
    responseLength: 'brief',
    writerTemperature: 0.7,
    verificationEnabled: false,
    passThreshold: 0.3,
    weakThreshold: 0.15,
    maxCorrectionRetries: 0,
    correctionTimeoutMs: 0,
    correctionTemperature: 0.1,
  },
  balanced: {
    maxIterations: 6,
    responseLength: 'standard',
    writerTemperature: 0.4,
    verificationEnabled: true,
    passThreshold: 0.4,
    weakThreshold: 0.2,
    maxCorrectionRetries: 1,
    correctionTimeoutMs: 12000,
    correctionTemperature: 0.1,
  },
  quality: {
    maxIterations: 25,
    responseLength: 'comprehensive',
    writerTemperature: 0.3,
    verificationEnabled: true,
    passThreshold: 0.5,
    weakThreshold: 0.3,
    maxCorrectionRetries: 2,
    correctionTimeoutMs: 20000,
    correctionTemperature: 0.1,
  },
};

export function resolvePipelineConfig(
  mode: OptimizationMode,
  overrides?: PipelineOverrides,
): ResolvedPipelineConfig {
  const defaults = MODE_DEFAULTS[mode];
  return { ...defaults, mode, ...overrides };
}

export function toVerificationConfig(
  resolved: ResolvedPipelineConfig,
): VerificationConfig {
  return {
    enabled: resolved.verificationEnabled,
    mode: resolved.mode,
    passThreshold: resolved.passThreshold,
    weakThreshold: resolved.weakThreshold,
    maxCorrectionRetries: resolved.maxCorrectionRetries,
    correctionTimeoutMs: resolved.correctionTimeoutMs,
    writerTemperature: resolved.writerTemperature,
    correctionTemperature: resolved.correctionTemperature,
  };
}
