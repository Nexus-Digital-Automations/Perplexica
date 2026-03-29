import SessionManager from '@/lib/session';
import BaseLLM from '@/lib/models/base/llm';
import { Chunk, TextBlock } from '@/lib/types';
import { GenerateTextInput } from '@/lib/models/types';
import { VerificationConfig } from './types';
import { verifyCitations, correctFailedCitations } from './verifier';

type StreamWithVerificationOpts = {
  session: SessionManager;
  llm: BaseLLM<any>;
  streamInput: GenerateTextInput;
  sources: Chunk[];
  config: VerificationConfig;
  emitMode: 'blocks' | 'events';
};

type StreamWithVerificationResult = {
  usage: { prompt_tokens: number; completion_tokens: number } | null;
};

export async function streamWithVerification(
  opts: StreamWithVerificationOpts,
): Promise<StreamWithVerificationResult> {
  const { session, llm, streamInput, sources, config, emitMode } = opts;

  const inputWithTemp: GenerateTextInput = {
    ...streamInput,
    options: {
      ...streamInput.options,
      ...(config.enabled ? { temperature: config.writerTemperature } : {}),
    },
  };

  const answerStream = llm.streamText(inputWithTemp);
  let fullText = '';
  let responseBlockId = '';
  let capturedUsage: { prompt_tokens: number; completion_tokens: number } | null = null;

  if (emitMode === 'blocks') {
    for await (const chunk of answerStream) {
      if (chunk.additionalInfo?.usage !== undefined) {
        capturedUsage = chunk.additionalInfo.usage;
      }
      fullText += chunk.contentChunk;

      if (!responseBlockId) {
        if (!chunk.contentChunk) continue;
        const block: TextBlock = {
          id: crypto.randomUUID(),
          type: 'text',
          data: chunk.contentChunk,
        };
        session.emitBlock(block);
        responseBlockId = block.id;
      } else {
        const block = session.getBlock(responseBlockId) as TextBlock | null;
        if (!block) continue;

        block.data += chunk.contentChunk;
        session.updateBlock(block.id, [
          { op: 'replace', path: '/data', value: block.data },
        ]);
      }
    }
  } else {
    for await (const chunk of answerStream) {
      if (chunk.additionalInfo?.usage !== undefined) {
        capturedUsage = chunk.additionalInfo.usage;
      }
      fullText += chunk.contentChunk;
      if (chunk.contentChunk) {
        session.emit('data', {
          type: 'response',
          data: chunk.contentChunk,
        });
      }
    }
  }

  if (!config.enabled || sources.length === 0) {
    return { usage: capturedUsage };
  }

  session.emit('data', { type: 'verificationStart' });

  let report = verifyCitations(fullText, sources, config);

  if (report.totalCitations === 0) {
    session.emit('data', {
      type: 'verificationComplete',
      data: {
        status: 'none',
        totalCitations: 0,
        passed: 0,
        weak: 0,
        failed: 0,
        wasCorrected: false,
      },
    });
    return { usage: capturedUsage };
  }

  if (report.failed > 0 && config.maxCorrectionRetries > 0) {
    // If any failed citation was against a verbatim source, use extra retries —
    // the exact text is available so corrections are high-value.
    const hasVerbatimFailures = report.results.some(
      (r) => r.status === 'fail' && sources[r.citationIndex - 1]?.metadata?.isVerbatim,
    );
    const effectiveRetries = hasVerbatimFailures
      ? Math.max(config.maxCorrectionRetries, 2)
      : config.maxCorrectionRetries;

    // Run corrections sequentially with increasing temperature.
    // Stop as soon as a correction eliminates all failures.
    const temperatures = [0.1, 0.3];

    for (let retry = 0; retry < effectiveRetries; retry++) {
      const temp = temperatures[Math.min(retry, temperatures.length - 1)];
      const correctedText = await correctFailedCitations(
        fullText,
        report,
        sources,
        llm,
        { ...config, correctionTemperature: temp },
      ).catch(() => null);

      if (!correctedText) continue;

      const newReport = verifyCitations(correctedText, sources, config);

      if (newReport.failed < report.failed) {
        fullText = correctedText;
        report = { ...newReport, wasCorrected: true, correctedText };

        if (emitMode === 'blocks' && responseBlockId) {
          session.updateBlock(responseBlockId, [
            { op: 'replace', path: '/data', value: correctedText },
          ]);
        } else if (emitMode === 'events') {
          session.emit('data', {
            type: 'correctedResponse',
            data: correctedText,
          });
        }

        // Stop if all failures are resolved
        if (newReport.failed === 0) break;
      }
    }
  }

  const avgScore = report.results.length > 0
    ? report.results.reduce((sum, r) => sum + r.similarity, 0) / report.results.length
    : 0;

  session.emit('data', {
    type: 'verificationComplete',
    data: {
      status: report.failed === 0 && report.weak === 0 ? 'verified' : 'partial',
      totalCitations: report.totalCitations,
      passed: report.passed,
      weak: report.weak,
      failed: report.failed,
      wasCorrected: report.wasCorrected,
      accuracyScore: Math.round(avgScore * 100),
      results: (report.results || []).map((r) => ({
        citationIndex: r.citationIndex,
        status: r.status,
        similarity: r.similarity,
        matchedSnippet: r.matchedSnippet,
        sentence: r.sentence,
      })),
    },
  });

  return { usage: capturedUsage };
}