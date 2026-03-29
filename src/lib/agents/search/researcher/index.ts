import { ActionOutput, ResearcherInput, ResearcherOutput } from '../types';
import { ActionRegistry } from './actions';
import { getResearcherPrompt } from '@/lib/prompts/search/researcher';
import SessionManager from '@/lib/session';
import { Message, ReasoningResearchBlock } from '@/lib/types';
import formatChatHistoryAsString from '@/lib/utils/formatHistory';
import { ToolCall } from '@/lib/models/types';
import { calculateCost } from '@/lib/pricing/modelPricing';

class Researcher {
  async research(
    session: SessionManager,
    input: ResearcherInput,
  ): Promise<ResearcherOutput> {
    let maxIteration = input.maxIterations ?? 6;
    const urlCache = new Map<string, string>();

    const availableTools = ActionRegistry.getAvailableActionTools({
      classification: input.classification,
      fileIds: input.config.fileIds,
      sources: input.config.sources,
    });

    const availableActionsDescription =
      ActionRegistry.getAvailableActionsDescriptions({
        classification: input.classification,
        fileIds: input.config.fileIds,
        sources: input.config.sources,
      });

    const researchBlockId = crypto.randomUUID();

    session.emitBlock({
      id: researchBlockId,
      type: 'research',
      data: {
        subSteps: [],
        question: input.question,
        questionIndex: input.questionIndex,
        questionTotal: input.questionTotal,
      },
    });

    let actionOutput: ActionOutput[] = input.initialActionOutput
      ? [...input.initialActionOutput]
      : [];

    let initialContent = `
          <conversation>
          ${formatChatHistoryAsString(input.chatHistory.slice(-10))}
           User: ${input.followUp} (Standalone question: ${input.classification.standaloneFollowUp})
           </conversation>
        `;

    if (input.initialActionOutput && input.initialActionOutput.length > 0) {
      initialContent += `\n<preliminary_search_results>The following search results were pre-fetched. If they sufficiently answer the question, call done() immediately rather than searching again.\n${JSON.stringify(input.initialActionOutput)}\n</preliminary_search_results>`;
    }

    const agentMessageHistory: Message[] = [
      {
        role: 'user',
        content: initialContent,
      },
    ];

    const modelId =
      (input.config.llm as any).config?.model as string ?? '';

    for (let i = 0; i < maxIteration; i++) {
      if (input.budgetTracker?.hasExceeded()) break;

      const researcherPrompt = getResearcherPrompt(
        availableActionsDescription,
        i,
        maxIteration,
        input.config.fileIds,
      );

      const actionStream = input.config.llm.streamText({
        messages: [
          {
            role: 'system',
            content: researcherPrompt,
          },
          ...agentMessageHistory,
        ],
        tools: availableTools,
      });

      const block = session.getBlock(researchBlockId);

      let reasoningEmitted = false;
      let reasoningId = crypto.randomUUID();

      let finalToolCalls: ToolCall[] = [];
      let accumulatedReasoningContent = '';
      let lastUsage: { prompt_tokens: number; completion_tokens: number } | null = null;

      for await (const partialRes of actionStream) {
        if (partialRes.reasoningContentChunk) {
          accumulatedReasoningContent += partialRes.reasoningContentChunk;
        }
        if (partialRes.done && partialRes.additionalInfo?.usage) {
          lastUsage = partialRes.additionalInfo.usage as {
            prompt_tokens: number;
            completion_tokens: number;
          };
        }
        if (partialRes.toolCallChunk.length > 0) {
          partialRes.toolCallChunk.forEach((tc) => {
            if (
              tc.name === '__reasoning_preamble' &&
              tc.arguments['plan'] &&
              !reasoningEmitted &&
              block &&
              block.type === 'research'
            ) {
              reasoningEmitted = true;

              block.data.subSteps.push({
                id: reasoningId,
                type: 'reasoning',
                reasoning: tc.arguments['plan'],
              });

              session.updateBlock(researchBlockId, [
                {
                  op: 'replace',
                  path: '/data/subSteps',
                  value: block.data.subSteps,
                },
              ]);
            } else if (
              tc.name === '__reasoning_preamble' &&
              tc.arguments['plan'] &&
              reasoningEmitted &&
              block &&
              block.type === 'research'
            ) {
              const subStepIndex = block.data.subSteps.findIndex(
                (step: any) => step.id === reasoningId,
              );

              if (subStepIndex !== -1) {
                const subStep = block.data.subSteps[
                  subStepIndex
                ] as ReasoningResearchBlock;
                subStep.reasoning = tc.arguments['plan'];
                session.updateBlock(researchBlockId, [
                  {
                    op: 'replace',
                    path: '/data/subSteps',
                    value: block.data.subSteps,
                  },
                ]);
              }
            }

            const existingIndex = finalToolCalls.findIndex(
              (ftc) => ftc.id === tc.id,
            );

            if (existingIndex !== -1) {
              finalToolCalls[existingIndex].arguments = tc.arguments;
            } else {
              finalToolCalls.push(tc);
            }
          });
        }
      }

      if (lastUsage) {
        const iterCost = calculateCost(lastUsage, modelId);
        if (iterCost !== null) input.budgetTracker?.record(iterCost);
      }

      if (finalToolCalls.length === 0) {
        break;
      }

      if (finalToolCalls[finalToolCalls.length - 1].name === 'done') {
        break;
      }

      agentMessageHistory.push({
        role: 'assistant',
        content: '',
        tool_calls: finalToolCalls,
        ...(accumulatedReasoningContent && {
          reasoning_content: accumulatedReasoningContent,
        }),
      });

      const actionResults = await ActionRegistry.executeAll(finalToolCalls, {
        llm: input.config.llm,
        embedding: input.config.embedding,
        session: session,
        researchBlockId: researchBlockId,
        fileIds: input.config.fileIds,
        urlCache,
      });

      actionOutput.push(...actionResults);

      actionResults.forEach((action, i) => {
        agentMessageHistory.push({
          role: 'tool',
          id: finalToolCalls[i].id,
          name: finalToolCalls[i].name,
          content: JSON.stringify(action),
        });
      });

      // Sufficiency nudge: hint the LLM to call done() when enough sources gathered
      const uniqueUrls = new Set(
        actionOutput
          .filter((a) => a.type === 'search_results')
          .flatMap((a) => a.results)
          .map((r) => r.metadata?.url)
          .filter(Boolean),
      );
      const sufficiencyThreshold = 5;
      if (uniqueUrls.size >= sufficiencyThreshold) {
        agentMessageHistory.push({
          role: 'user',
          content: `[System Note] You have gathered ${uniqueUrls.size} unique sources so far. If they sufficiently answer the query, call done() now to proceed to the writing phase rather than searching further.`,
        });
      }
    }

    const searchResults = actionOutput
      .filter((a) => a.type === 'search_results')
      .flatMap((a) => a.results);

    const seenUrls = new Map<string, number>();

    const filteredSearchResults = searchResults
      .map((result, index) => {
        if (result.metadata.url && !seenUrls.has(result.metadata.url)) {
          seenUrls.set(result.metadata.url, index);
          return result;
        } else if (result.metadata.url && seenUrls.has(result.metadata.url)) {
          const existingIndex = seenUrls.get(result.metadata.url)!;

          const existingResult = searchResults[existingIndex];

          existingResult.content += `\n\n${result.content}`;

          return undefined;
        }

        return result;
      })
      .filter((r) => r !== undefined);

    session.emitBlock({
      id: crypto.randomUUID(),
      type: 'source',
      data: filteredSearchResults,
    });

    return {
      findings: actionOutput,
      searchFindings: filteredSearchResults,
    };
  }
}

export default Researcher;
