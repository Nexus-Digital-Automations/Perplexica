import z from 'zod';
import { ResearchAction } from '../../types';
import { Chunk, ReadingResearchBlock } from '@/lib/types';
import { fetchAndExtractPassages, fetchPageMarkdown } from '@/lib/utils/fetchPageContent';
import { classifySource } from '@/lib/utils/sourceCredibility';

const actionSchema = z.object({
  url: z.string().describe('The URL to read and extract passages from'),
  queries: z
    .array(z.string())
    .max(3)
    .describe(
      'Specific factual questions or topics to extract relevant passages about from this page',
    ),
});

const toolDescription =
  'Use this tool to read a specific web page and extract relevant passages. Provide the URL and specific queries about what information you need. Returns verbatim text passages from the page. Use this after web_search identifies promising sources to get exact quotes for faithful citation.';

const readPageAction: ResearchAction<typeof actionSchema> = {
  name: 'read_page',
  schema: actionSchema,
  getToolDescription: () => toolDescription,
  getDescription: () => toolDescription,
  enabled: (config) =>
    config.sources.includes('web') &&
    config.classification.classification.skipSearch === false,
  execute: async (input, additionalConfig) => {
    // Check URL cache for previously fetched markdown
    let cachedMarkdown: string | undefined;
    if (additionalConfig.urlCache) {
      cachedMarkdown = additionalConfig.urlCache.get(input.url);
    }

    // If not cached, fetch and cache it
    if (!cachedMarkdown) {
      const markdown = await fetchPageMarkdown(input.url);
      if (markdown && additionalConfig.urlCache) {
        additionalConfig.urlCache.set(input.url, markdown);
        cachedMarkdown = markdown;
      }
    }

    // Extract verbatim passages
    const passages = await fetchAndExtractPassages(
      input.url,
      input.queries,
      2,
      cachedMarkdown,
    );

    const cred = classifySource(input.url);

    const resultChunks: Chunk[] = passages.map((passage) => ({
      content: passage.text,
      metadata: {
        url: input.url,
        title: input.url,
        isVerbatim: true,
        extractionQuery: input.queries.join(', '),
        credibilityTier: cred.tierNumber,
        credibilityLabel: cred.tierLabel,
      },
    }));

    // Emit reading substep to the research block
    const researchBlock = additionalConfig.session.getBlock(
      additionalConfig.researchBlockId,
    );
    if (researchBlock && researchBlock.type === 'research') {
      const readingBlock: ReadingResearchBlock = {
        id: crypto.randomUUID(),
        type: 'reading',
        reading: resultChunks,
      };

      researchBlock.data.subSteps.push(readingBlock);
      additionalConfig.session.updateBlock(additionalConfig.researchBlockId, [
        {
          op: 'replace',
          path: '/data/subSteps',
          value: researchBlock.data.subSteps,
        },
      ]);
    }

    return {
      type: 'search_results' as const,
      results: resultChunks,
    };
  },
};

export default readPageAction;
