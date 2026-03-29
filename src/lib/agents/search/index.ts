import { ActionOutput, SearchAgentInput } from './types';
import SessionManager from '@/lib/session';
import { classify } from './classifier';
import Researcher from './researcher';
import QuestionGenerator from './question-generator';
import { getWriterPrompt } from '@/lib/prompts/search/writer';
import { WidgetExecutor } from './widgets';
import db from '@/lib/db';
import { chats, messages } from '@/lib/db/schema';
import { and, eq, gt } from 'drizzle-orm';
import { streamWithVerification } from '@/lib/verification/streamVerifier';
import { resolvePipelineConfig, toVerificationConfig } from '@/lib/config/pipeline';
import { searchSearxng } from '@/lib/searxng';
import { calculateCost } from '@/lib/pricing/modelPricing';
import { BudgetTracker } from '@/lib/pricing/budgetTracker';
import { Chunk, QuestionCategory } from '@/lib/types';
import { aggregateEvidence } from './aggregator';

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms),
    ),
  ]);
}

const SELECTION_TIMEOUT_MS = 120_000; // 2 minutes
const PER_QUESTION_TIMEOUT_MS = 90_000; // 90s per question — generous but prevents infinite hangs

class SearchAgent {
  async searchAsync(session: SessionManager, input: SearchAgentInput) {
    try {
      await this._run(session, input);
    } catch (err: any) {
      console.error('SearchAgent error:', err);
      session.emit('error', { data: err?.message ?? 'An unknown error occurred.' });
      await db
        .update(messages)
        .set({ status: 'error' })
        .where(
          and(
            eq(messages.chatId, input.chatId),
            eq(messages.messageId, input.messageId),
          ),
        )
        .execute()
        .catch(() => {});
    }
  }

  private async _run(session: SessionManager, input: SearchAgentInput) {
    const exists = await db.query.messages.findFirst({
      where: and(
        eq(messages.chatId, input.chatId),
        eq(messages.messageId, input.messageId),
      ),
    });

    if (!exists) {
      await db.insert(messages).values({
        chatId: input.chatId,
        messageId: input.messageId,
        backendId: session.id,
        query: input.followUp,
        createdAt: new Date().toISOString(),
        status: 'answering',
        responseBlocks: [],
      });
    } else {
      await db
        .delete(messages)
        .where(
          and(eq(messages.chatId, input.chatId), gt(messages.id, exists.id)),
        )
        .execute();
      await db
        .update(messages)
        .set({
          status: 'answering',
          backendId: session.id,
          responseBlocks: [],
        })
        .where(
          and(
            eq(messages.chatId, input.chatId),
            eq(messages.messageId, input.messageId),
          ),
        )
        .execute();
    }

    const resolved = resolvePipelineConfig(input.config.overrides);
    const budgetTracker = new BudgetTracker(resolved.budgetUsd);

    const questionGenerator = new QuestionGenerator();
    const useInteractive =
      resolved.numQuestions > 1 && resolved.interactiveQuestions;

    // Generate questions: categorized if interactive, flat if not
    const [classification, prelimSearxng, questionResult] = await Promise.all([
      withTimeout(
        classify({
          chatHistory: input.chatHistory,
          enabledSources: input.config.sources,
          query: input.followUp,
          llm: input.config.llm,
        }),
        20_000,
        'classifier',
      ),
      input.config.sources.includes('web')
        ? searchSearxng(input.followUp, {
            categories: ['general'],
            engines: ['google'],
          }).catch(() => ({ results: [], suggestions: [] as string[] }))
        : Promise.resolve({ results: [], suggestions: [] as string[] }),
      resolved.numQuestions > 1
        ? useInteractive
          ? withTimeout(
              questionGenerator.generateCategorized(
                input.followUp,
                resolved.numQuestions,
                input.config.llm,
                input.chatHistory,
              ),
              30_000,
              'question-generator',
            ).catch(
              (): QuestionCategory[] => [
                { category: 'General', questions: [input.followUp] },
              ],
            )
          : withTimeout(
              questionGenerator.generate(
                input.followUp,
                resolved.numQuestions,
                input.config.llm,
                input.chatHistory,
              ),
              30_000,
              'question-generator',
            ).catch(() => [input.followUp])
        : Promise.resolve([input.followUp]),
    ]);

    session.emitBlock({
      id: crypto.randomUUID(),
      type: 'classification',
      data: {
        standaloneFollowUp: classification.standaloneFollowUp,
        skipSearch: classification.classification.skipSearch,
      },
    });

    const widgetPromise = WidgetExecutor.executeAll({
      classification,
      chatHistory: input.chatHistory,
      followUp: input.followUp,
      llm: input.config.llm,
    }).then((widgetOutputs) => {
      widgetOutputs.forEach((o) => {
        session.emitBlock({
          id: crypto.randomUUID(),
          type: 'widget',
          data: {
            widgetType: o.type,
            params: o.data,
          },
        });
      });
      return widgetOutputs;
    });

    let mergedSearchFindings: Chunk[] = [];

    if (!classification.classification.skipSearch) {
      const numQuestions = resolved.numQuestions;

      if (numQuestions === 1) {
        // --- Single-question path ---
        const prelimActionOutput: ActionOutput[] =
          prelimSearxng.results.length > 0
            ? [
                {
                  type: 'search_results',
                  results: prelimSearxng.results.map((r) => ({
                    content: r.content || r.title,
                    metadata: { title: r.title, url: r.url },
                  })),
                },
              ]
            : [];

        const researcher = new Researcher();
        const result = await researcher.research(session, {
          chatHistory: input.chatHistory,
          followUp: input.followUp,
          classification: classification,
          config: input.config,
          maxIterations: resolved.sourcesPerQuestion,
          initialActionOutput: prelimActionOutput,
          budgetTracker,
        });
        mergedSearchFindings = result.searchFindings;
      } else {
        // --- Multi-question path ---
        let questions: string[];

        if (useInteractive) {
          // Interactive: emit QuestionsBlock and wait for user selection
          const categories = questionResult as QuestionCategory[];
          const questionsBlockId = crypto.randomUUID();

          session.emitBlock({
            id: questionsBlockId,
            type: 'questions',
            data: {
              sessionId: session.id,
              categories,
              status: 'pending',
            },
          });

          // Wait for user selection or auto-proceed on timeout
          const allQuestions = categories.flatMap((c) => c.questions);

          const selectedQuestions = await Promise.race([
            session.waitForSelection(),
            new Promise<string[]>((resolve) =>
              setTimeout(() => resolve(allQuestions), SELECTION_TIMEOUT_MS),
            ),
          ]);

          // Update block to confirmed
          session.updateBlock(questionsBlockId, [
            { op: 'replace', path: '/data/status', value: 'confirmed' },
            {
              op: 'add',
              path: '/data/selectedQuestions',
              value: selectedQuestions,
            },
          ]);

          questions = selectedQuestions;
        } else {
          // Non-interactive: use all generated questions directly
          questions = questionResult as string[];
        }

        const questionTotal = questions.length;

        let completedCount = 0;

        const runResearcher = async (
          question: string,
          questionIndex: number,
        ): Promise<Chunk[]> => {
          if (budgetTracker.hasExceeded()) return [];
          const researcher = new Researcher();
          const result = await withTimeout(
            researcher.research(session, {
              chatHistory: input.chatHistory,
              followUp: question,
              classification: classification,
              config: input.config,
              maxIterations: resolved.sourcesPerQuestion,
              question,
              questionIndex,
              questionTotal,
              budgetTracker,
            }),
            PER_QUESTION_TIMEOUT_MS,
            `research Q${questionIndex}`,
          ).catch((err) => {
            console.warn(`Research Q${questionIndex} failed/timed out:`, err.message);
            return { findings: [], searchFindings: [] as Chunk[] };
          });

          completedCount++;
          session.emit('data', {
            type: 'researchProgress',
            questionsCompleted: completedCount,
            questionTotal,
          });

          return result.searchFindings;
        };

        let allFindings: Chunk[];

        if (resolved.questionsParallel) {
          const results = await Promise.all(
            questions.map((q, i) => runResearcher(q, i + 1)),
          );
          allFindings = results.flat();
        } else {
          allFindings = [];
          for (let i = 0; i < questions.length; i++) {
            if (budgetTracker.hasExceeded()) break;
            const qFindings = await runResearcher(questions[i], i + 1);
            allFindings.push(...qFindings);
          }
        }

        // Deduplicate by URL across all questions
        const seenUrls = new Map<string, number>();
        const deduped: Chunk[] = [];
        for (const result of allFindings) {
          if (result.metadata.url && !seenUrls.has(result.metadata.url)) {
            seenUrls.set(result.metadata.url, deduped.length);
            deduped.push(result);
          } else if (result.metadata.url && seenUrls.has(result.metadata.url)) {
            const existingIndex = seenUrls.get(result.metadata.url)!;
            if (deduped[existingIndex].content.length < 20_000) {
              deduped[existingIndex].content += `\n\n${result.content}`;
            }
          } else {
            deduped.push(result);
          }
        }
        mergedSearchFindings = deduped;
      }
    }

    const [widgetOutputs] = await Promise.all([widgetPromise]);

    session.emit('data', {
      type: 'researchComplete',
    });

    const finalContext = mergedSearchFindings.length > 0
      ? aggregateEvidence(mergedSearchFindings)
      : '';

    const widgetContext = widgetOutputs
      .map((o) => {
        return `<result>${o.llmContext}</result>`;
      })
      .join('\n-------------\n');

    const finalContextWithWidgets = `<search_results note="These are the search results and assistant can cite these">\n${finalContext}\n</search_results>\n<widgets_result noteForAssistant="Its output is already showed to the user, assistant can use this information to answer the query but do not CITE this as a souce">\n${widgetContext}\n</widgets_result>`;

    const writerPrompt = getWriterPrompt(
      finalContextWithWidgets,
      input.config.systemInstructions,
      resolved.responseLength,
      classification.classification.skipSearch,
    );

    const verificationConfig = toVerificationConfig(resolved);

    const writerResult = await streamWithVerification({
      session,
      llm: input.config.llm,
      streamInput: {
        messages: [
          {
            role: 'system',
            content: writerPrompt,
          },
          ...input.chatHistory,
          {
            role: 'user',
            content: input.followUp,
          },
        ],
      },
      sources: mergedSearchFindings,
      config: verificationConfig,
      emitMode: 'blocks',
    });

    const modelId = (input.config.llm as any).config?.model as string ?? '';
    const cost = calculateCost(writerResult.usage, modelId);
    if (cost !== null) {
      budgetTracker.record(cost);
      session.emitBlock({
        id: crypto.randomUUID(),
        type: 'cost',
        costUsd: cost,
        modelId,
        totalSpentUsd: budgetTracker.spent,
        budgetUsd: resolved.budgetUsd,
      });
    }

    session.emit('end', {});

    await db
      .update(messages)
      .set({
        status: 'completed',
        responseBlocks: session.getAllBlocks(),
      })
      .where(
        and(
          eq(messages.chatId, input.chatId),
          eq(messages.messageId, input.messageId),
        ),
      )
      .execute();
  }
}

export default SearchAgent;
