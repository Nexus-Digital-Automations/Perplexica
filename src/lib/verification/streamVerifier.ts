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

export async function streamWithVerification(
  opts: StreamWithVerificationOpts,
): Promise<void> {
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

  if (emitMode === 'blocks') {
    for await (const chunk of answerStream) {
      fullText += chunk.contentChunk;

      if (!responseBlockId) {
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
      fullText += chunk.contentChunk;
      session.emit('data', {
        type: 'response',
        data: chunk.contentChunk,
      });
    }
  }

  if (!config.enabled || sources.length === 0) {
    return;
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
    return;
  }

  if (report.failed > 0 && config.maxCorrectionRetries > 0) {
    for (let retry = 0; retry < config.maxCorrectionRetries; retry++) {
      const correctedText = await correctFailedCitations(
        fullText,
        report,
        sources,
        llm,
        config,
      );

      if (!correctedText) break;

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

        if (newReport.failed === 0) break;
      } else {
        break;
      }
    }
  }

  session.emit('data', {
    type: 'verificationComplete',
    data: {
      status: report.failed === 0 && report.weak === 0 ? 'verified' : 'partial',
      totalCitations: report.totalCitations,
      passed: report.passed,
      weak: report.weak,
      failed: report.failed,
      wasCorrected: report.wasCorrected,
    },
  });
}
