import { ResearcherOutput, SearchAgentInput, ActionOutput } from './types';
import SessionManager from '@/lib/session';
import { classify } from './classifier';
import Researcher from './researcher';
import { getWriterPrompt } from '@/lib/prompts/search/writer';
import { WidgetExecutor } from './widgets';
import { streamWithVerification } from '@/lib/verification/streamVerifier';
import { resolvePipelineConfig, toVerificationConfig } from '@/lib/config/pipeline';
import { searchSearxng } from '@/lib/searxng';
import { Chunk } from '@/lib/types';
import { aggregateEvidence } from './aggregator';

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms),
    ),
  ]);
}

class APISearchAgent {
  async searchAsync(session: SessionManager, input: SearchAgentInput) {
    const resolved = resolvePipelineConfig(input.config.overrides);

    const [classification, prelimSearxng] = await Promise.all([
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
    ]);

    const widgetPromise = WidgetExecutor.executeAll({
      classification,
      chatHistory: input.chatHistory,
      followUp: input.followUp,
      llm: input.config.llm,
    }).catch((err) => {
      console.error(`Error executing widgets: ${err}`);
      return [];
    });

    let searchPromise: Promise<ResearcherOutput> | null = null;

    if (!classification.classification.skipSearch) {
      const researcher = new Researcher();
      searchPromise = researcher.research(SessionManager.createSession(), {
        chatHistory: input.chatHistory,
        followUp: input.followUp,
        classification: classification,
        config: input.config,
        maxIterations: resolved.sourcesPerQuestion,
        initialActionOutput: prelimSearxng.results.length > 0 ? [{
          type: 'search_results' as const,
          results: prelimSearxng.results.map((r) => ({
            content: r.content || r.title,
            metadata: { title: r.title, url: r.url },
          })),
        }] : [],
      });
    }

    const [widgetOutputs, searchResults] = await Promise.all([
      widgetPromise,
      searchPromise,
    ]);

    if (searchResults) {
      session.emit('data', {
        type: 'searchResults',
        data: searchResults.searchFindings,
      });
    }

    session.emit('data', {
      type: 'researchComplete',
    });

    const finalContext = searchResults?.searchFindings?.length
      ? aggregateEvidence(searchResults.searchFindings)
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
    );

    const verificationConfig = toVerificationConfig(resolved);

    await streamWithVerification({
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
      sources: searchResults?.searchFindings || [],
      config: verificationConfig,
      emitMode: 'events',
    });

    session.emit('end', {});
  }
}

export default APISearchAgent;