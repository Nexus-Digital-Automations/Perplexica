import { FastMCP } from 'fastmcp';
import { z } from 'zod';
import {
  resolvePipelineConfig,
  toVerificationConfig,
  type OptimizationMode,
  type PipelineOverrides,
} from '../lib/config/pipeline.js';
import { verifyCitations } from '../lib/verification/verifier.js';
import { extractCitations } from '../lib/verification/citationExtractor.js';
import { bestWindowMatch } from '../lib/verification/textSimilarity.js';
import type { Chunk } from '../lib/types.js';

const BASE_URL = process.env.PERPLEXICA_URL || 'http://localhost:3000';

async function fetchJSON(
  path: string,
  options?: RequestInit,
): Promise<unknown> {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(
      `Perplexica API error ${res.status} ${res.statusText}: ${body}`,
    );
  }

  return res.json();
}

interface ProviderInfo {
  id: string;
  chatModels: Array<{ key: string; displayName?: string }>;
  embeddingModels?: Array<{ key: string; displayName?: string }>;
}

interface ResolvedModels {
  chatModel: { providerId: string; key: string };
  embeddingModel: { providerId: string; key: string };
}

async function resolveModels(opts?: {
  chatModelProvider?: string;
  chatModelKey?: string;
  embeddingModelProvider?: string;
  embeddingModelKey?: string;
}): Promise<ResolvedModels> {
  const data = (await fetchJSON('/api/providers')) as {
    providers: ProviderInfo[];
  };
  const providers = data.providers;

  if (!providers || providers.length === 0) {
    throw new Error(
      'No model providers configured in Perplexica. ' +
        'Please configure at least one provider in the Perplexica settings.',
    );
  }

  let chatModel: { providerId: string; key: string };
  if (opts?.chatModelProvider && opts?.chatModelKey) {
    chatModel = {
      providerId: opts.chatModelProvider,
      key: opts.chatModelKey,
    };
  } else {
    const chatProvider = providers.find(
      (p) => p.chatModels && p.chatModels.length > 0,
    );
    if (!chatProvider) {
      throw new Error(
        'No provider with chat models found. ' +
          'Please configure a chat model provider in Perplexica.',
      );
    }
    chatModel = {
      providerId: chatProvider.id,
      key: chatProvider.chatModels[0].key,
    };
  }

  let embeddingModel: { providerId: string; key: string };
  if (opts?.embeddingModelProvider && opts?.embeddingModelKey) {
    embeddingModel = {
      providerId: opts.embeddingModelProvider,
      key: opts.embeddingModelKey,
    };
  } else {
    const embeddingProvider = providers.find(
      (p) => p.embeddingModels && p.embeddingModels.length > 0,
    );
    if (!embeddingProvider || !embeddingProvider.embeddingModels?.length) {
      throw new Error(
        'No provider with embedding models found. ' +
          'Please configure an embedding model provider in Perplexica.',
      );
    }
    embeddingModel = {
      providerId: embeddingProvider.id,
      key: embeddingProvider.embeddingModels[0].key,
    };
  }

  return { chatModel, embeddingModel };
}

const server = new FastMCP({
  name: 'perplexica',
  version: '2.0.0',
});

// ---------------------------------------------------------------------------
// Pipeline / Verification Tools (existing, unchanged)
// ---------------------------------------------------------------------------

const overridesSchema = {
  maxIterations: z.number().min(1).max(50).optional(),
  responseLength: z.enum(['brief', 'standard', 'comprehensive']).optional(),
  writerTemperature: z.number().min(0).max(1).optional(),
  verificationEnabled: z.boolean().optional(),
  passThreshold: z.number().min(0).max(1).optional(),
  weakThreshold: z.number().min(0).max(1).optional(),
  maxCorrectionRetries: z.number().min(0).max(5).optional(),
  correctionTimeoutMs: z.number().min(0).max(60000).optional(),
  correctionTemperature: z.number().min(0).max(1).optional(),
};

server.addTool({
  name: 'verify_citations',
  description:
    'Verify citation accuracy in text against source documents. Returns a full verification report with pass/weak/fail counts and per-citation details.',
  parameters: z.object({
    text: z.string().describe('The text containing citations like [1], [2] etc.'),
    sources: z
      .array(
        z.object({
          content: z.string(),
          metadata: z
            .object({
              title: z.string().optional().default(''),
              url: z.string().optional().default(''),
            })
            .optional()
            .default(() => ({ title: '', url: '' })),
        }),
      )
      .describe('Array of source documents to verify citations against'),
    mode: z
      .enum(['speed', 'balanced', 'quality'])
      .optional()
      .default('balanced')
      .describe('Pipeline mode preset'),
    overrides: z.object(overridesSchema).optional().describe('Override individual parameters'),
  }),
  execute: async (args: {
    text: string;
    sources: Array<{ content: string; metadata: { title: string; url: string } }>;
    mode: string;
    overrides?: Record<string, unknown>;
  }) => {
    const { text, sources, mode, overrides } = args;
    const resolved = resolvePipelineConfig(
      mode as OptimizationMode,
      overrides as PipelineOverrides | undefined,
    );
    const config = toVerificationConfig(resolved);

    const chunks: Chunk[] = sources.map((s) => ({
      content: s.content,
      metadata: {
        title: s.metadata?.title || '',
        url: s.metadata?.url || '',
      },
    }));

    const report = verifyCitations(text, chunks, config);
    return JSON.stringify(report, null, 2);
  },
});

server.addTool({
  name: 'extract_citations',
  description:
    'Extract all citations from text, returning sentence text, citation indices, and original text for each cited sentence.',
  parameters: z.object({
    text: z.string().describe('The text containing citations like [1], [2] etc.'),
  }),
  execute: async (args: { text: string }) => {
    const citations = extractCitations(args.text);
    return JSON.stringify(citations, null, 2);
  },
});

server.addTool({
  name: 'check_similarity',
  description:
    'Check the similarity between a claim and source content using Jaccard sliding window matching. Returns a score (0-1) and the best matching snippet.',
  parameters: z.object({
    claim: z.string().describe('The claim or sentence to check'),
    sourceContent: z.string().describe('The source text to match against'),
  }),
  execute: async (args: { claim: string; sourceContent: string }) => {
    const result = bestWindowMatch(args.claim, args.sourceContent);
    return JSON.stringify(result, null, 2);
  },
});

server.addTool({
  name: 'get_pipeline_config',
  description:
    'Get the fully resolved pipeline configuration for a given mode and optional overrides. Useful for inspecting what parameters any mode+override combination produces.',
  parameters: z.object({
    mode: z
      .enum(['speed', 'balanced', 'quality'])
      .describe('Pipeline mode preset'),
    overrides: z.object(overridesSchema).optional().describe('Override individual parameters'),
  }),
  execute: async (args: { mode: string; overrides?: Record<string, unknown> }) => {
    const resolved = resolvePipelineConfig(
      args.mode as OptimizationMode,
      args.overrides as PipelineOverrides | undefined,
    );
    return JSON.stringify(resolved, null, 2);
  },
});

// ---------------------------------------------------------------------------
// Search Tools (new — HTTP calls to running Perplexica instance)
// ---------------------------------------------------------------------------

const chatHistorySchema = z
  .array(z.tuple([z.string(), z.string()]))
  .optional()
  .default([])
  .describe(
    'Chat history as [role, content] tuples, e.g. [["human","hi"],["assistant","hello"]]',
  );

const modelParamsSchema = {
  chatModelProvider: z
    .string()
    .optional()
    .describe('Chat model provider ID (auto-detected if omitted)'),
  chatModelKey: z
    .string()
    .optional()
    .describe('Chat model key (auto-detected if omitted)'),
  embeddingModelProvider: z
    .string()
    .optional()
    .describe('Embedding model provider ID (auto-detected if omitted)'),
  embeddingModelKey: z
    .string()
    .optional()
    .describe('Embedding model key (auto-detected if omitted)'),
};

const chatOnlyModelParamsSchema = {
  chatModelProvider: z
    .string()
    .optional()
    .describe('Chat model provider ID (auto-detected if omitted)'),
  chatModelKey: z
    .string()
    .optional()
    .describe('Chat model key (auto-detected if omitted)'),
};

server.addTool({
  name: 'search',
  description:
    'Search the web using Perplexica and get an AI-generated answer with citations. ' +
    'Supports web, academic, and discussion sources. ' +
    'Quality mode produces more thorough results but takes longer (30+ seconds).',
  parameters: z.object({
    query: z.string().describe('The search query'),
    sources: z
      .array(z.enum(['web', 'discussions', 'academic']))
      .optional()
      .default(['web'])
      .describe('Source types to search'),
    optimizationMode: z
      .enum(['speed', 'balanced', 'quality'])
      .optional()
      .default('balanced')
      .describe('Speed/quality tradeoff'),
    history: chatHistorySchema,
    systemInstructions: z
      .string()
      .optional()
      .describe('Custom system instructions for the AI writer'),
    ...modelParamsSchema,
    overrides: z
      .object(overridesSchema)
      .optional()
      .describe('Pipeline parameter overrides'),
  }),
  execute: async (args) => {
    const models = await resolveModels({
      chatModelProvider: args.chatModelProvider,
      chatModelKey: args.chatModelKey,
      embeddingModelProvider: args.embeddingModelProvider,
      embeddingModelKey: args.embeddingModelKey,
    });

    const body: Record<string, unknown> = {
      query: args.query,
      sources: args.sources,
      optimizationMode: args.optimizationMode,
      history: args.history,
      stream: false,
      chatModel: models.chatModel,
      embeddingModel: models.embeddingModel,
    };

    if (args.systemInstructions) {
      body.systemInstructions = args.systemInstructions;
    }
    if (args.overrides) {
      body.overrides = args.overrides;
    }

    const result = await fetchJSON('/api/search', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    return JSON.stringify(result, null, 2);
  },
});

server.addTool({
  name: 'search_images',
  description:
    'Search for images related to a query. Returns image URLs, source pages, and titles.',
  parameters: z.object({
    query: z.string().describe('The image search query'),
    chatHistory: chatHistorySchema,
    ...chatOnlyModelParamsSchema,
  }),
  execute: async (args) => {
    const models = await resolveModels({
      chatModelProvider: args.chatModelProvider,
      chatModelKey: args.chatModelKey,
    });

    const result = await fetchJSON('/api/images', {
      method: 'POST',
      body: JSON.stringify({
        query: args.query,
        chatHistory: args.chatHistory,
        chatModel: models.chatModel,
      }),
    });

    return JSON.stringify(result, null, 2);
  },
});

server.addTool({
  name: 'search_videos',
  description:
    'Search for videos related to a query. Returns video thumbnails, URLs, titles, and embed links.',
  parameters: z.object({
    query: z.string().describe('The video search query'),
    chatHistory: chatHistorySchema,
    ...chatOnlyModelParamsSchema,
  }),
  execute: async (args) => {
    const models = await resolveModels({
      chatModelProvider: args.chatModelProvider,
      chatModelKey: args.chatModelKey,
    });

    const result = await fetchJSON('/api/videos', {
      method: 'POST',
      body: JSON.stringify({
        query: args.query,
        chatHistory: args.chatHistory,
        chatModel: models.chatModel,
      }),
    });

    return JSON.stringify(result, null, 2);
  },
});

server.addTool({
  name: 'discover',
  description:
    'Get trending/curated news content by topic. ' +
    'Does not require an AI model — uses SearXNG directly.',
  parameters: z.object({
    topic: z
      .enum(['tech', 'finance', 'art', 'sports', 'entertainment'])
      .optional()
      .default('tech')
      .describe('Topic category'),
    mode: z
      .enum(['normal', 'preview'])
      .optional()
      .default('normal')
      .describe('normal = comprehensive results, preview = quick sample'),
  }),
  execute: async (args) => {
    const params = new URLSearchParams();
    params.set('topic', args.topic);
    params.set('mode', args.mode);

    const result = await fetchJSON(`/api/discover?${params.toString()}`);
    return JSON.stringify(result, null, 2);
  },
});

server.addTool({
  name: 'get_suggestions',
  description:
    'Generate follow-up question suggestions based on chat history. ' +
    'Requires at least one message in the chat history.',
  parameters: z.object({
    chatHistory: z
      .array(z.tuple([z.string(), z.string()]))
      .min(1)
      .describe(
        'Chat history as [role, content] tuples (min 1), e.g. [["human","What is AI?"],["assistant","AI is..."]]',
      ),
    ...chatOnlyModelParamsSchema,
  }),
  execute: async (args) => {
    const models = await resolveModels({
      chatModelProvider: args.chatModelProvider,
      chatModelKey: args.chatModelKey,
    });

    const result = await fetchJSON('/api/suggestions', {
      method: 'POST',
      body: JSON.stringify({
        chatHistory: args.chatHistory,
        chatModel: models.chatModel,
      }),
    });

    return JSON.stringify(result, null, 2);
  },
});

server.addTool({
  name: 'list_chats',
  description: 'List all saved chat conversations in Perplexica.',
  parameters: z.object({}),
  execute: async () => {
    const result = await fetchJSON('/api/chats');
    return JSON.stringify(result, null, 2);
  },
});

server.addTool({
  name: 'get_chat',
  description:
    'Get a specific chat conversation with all its messages.',
  parameters: z.object({
    chatId: z.string().describe('The chat ID to retrieve'),
  }),
  execute: async (args) => {
    const result = await fetchJSON(`/api/chats/${encodeURIComponent(args.chatId)}`);
    return JSON.stringify(result, null, 2);
  },
});

server.start({
  transportType: 'stdio',
});
