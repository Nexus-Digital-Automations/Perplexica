import { resolvePipelineConfig, toVerificationConfig } from '@/lib/config/pipeline';

export type VerificationStatus = 'pass' | 'weak' | 'fail';

export type VerificationResult = {
  citationIndex: number;
  sentence: string;
  similarity: number;
  status: VerificationStatus;
  matchedSnippet: string;
};

export type VerificationReport = {
  totalCitations: number;
  passed: number;
  weak: number;
  failed: number;
  results: VerificationResult[];
  correctedText?: string;
  wasCorrected: boolean;
};

export type VerificationConfig = {
  enabled: boolean;
  mode: 'speed' | 'balanced' | 'quality';
  passThreshold: number;
  weakThreshold: number;
  maxCorrectionRetries: number;
  correctionTimeoutMs: number;
  writerTemperature: number;
  correctionTemperature: number;
};

export const getVerificationConfig = (
  mode: 'speed' | 'balanced' | 'quality',
): VerificationConfig => {
  return toVerificationConfig(resolvePipelineConfig(mode));
};
