import { FastMCP } from 'fastmcp';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { applyPatch } from 'rfc6902';
import {
  resolvePipelineConfig,
  toVerificationConfig,
  type PipelineOverrides,
} from '../lib/config/pipeline.js';
import { verifyCitations } from '../lib/verification/verifier.js';
import { extractCitations } from '../lib/verification/citationExtractor.js';
import { bestWindowMatch } from '../lib/verification/textSimilarity.js';
import type { Chunk, VerificationBlock } from '../lib/types.js';

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

async function resolveModels(opts?: {
  chatModelProvider?: string;
  chatModelKey?: string;
  embeddingModelProvider?: string;
  embeddingModelKey?: string;
  requireEmbedding?: boolean;
}): Promise<{
  chatModel: { providerId: string; key: string };
  embeddingModel?: { providerId: string; key: string };
}> {
  const requireEmbedding = opts?.requireEmbedding !== false;
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
    chatModel = { providerId: opts.chatModelProvider, key: opts.chatModelKey };
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

  if (!requireEmbedding) {
    return { chatModel };
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

// ---------------------------------------------------------------------------
// Shared schema fragments
// ---------------------------------------------------------------------------

const overridesSchema = {
  // Research depth
  sourcesPerQuestion: z.number().min(1).max(25).optional()
    .describe('Number of sources to retrieve per question (1-25, default 2)'),
  numQuestions: z.number().min(1).max(50).optional()
    .describe('Number of research sub-questions to generate (1-50, default 5)'),
  questionsParallel: z.boolean().optional()
    .describe('Run sub-question research in parallel (default true)'),
  maxConcurrentResearchers: z.number().min(1).max(10).optional()
    .describe('Max parallel researcher agents (1-10, default 5)'),
  // Budget
  budgetUsd: z.number().min(0).nullable().optional()
    .describe('USD cost cap per request — agent stops when reached (null = unlimited)'),
  // Response format
  responseLength: z.enum(['brief', 'standard', 'comprehensive']).optional()
    .describe('Response length: brief (300-500 words), standard, or comprehensive (2000+ words)'),
  writerTemperature: z.number().min(0).max(1).optional()
    .describe('LLM temperature for the writer (0-1, default 0.2)'),
  // Source quality
  credibilityThresholdAdjustment: z.number().min(0).max(1).optional()
    .describe('Tighten source credibility filtering — higher = stricter (0-1, default 0.03)'),
  // Citation verification
  verificationEnabled: z.boolean().optional()
    .describe('Enable citation accuracy verification (default true)'),
  passThreshold: z.number().min(0).max(1).optional()
    .describe('Similarity threshold to pass citation check (0-1, default 0.30)'),
  verbatimPassThreshold: z.number().min(0).max(1).optional()
    .describe('Similarity threshold for verbatim/exact match (0-1, default 0.50)'),
  weakThreshold: z.number().min(0).max(1).optional()
    .describe('Similarity threshold for weak citation match (0-1, default 0.18)'),
  maxCorrectionRetries: z.number().min(0).max(5).optional()
    .describe('Max retries for correcting failed citations (0-5, default 1)'),
  correctionTimeoutMs: z.number().min(0).max(60000).optional()
    .describe('Timeout for citation correction in ms (default 12000)'),
  correctionTemperature: z.number().min(0).max(1).optional()
    .describe('LLM temperature for citation correction (0-1, default 0.1)'),
  // Interaction
  interactiveQuestions: z.boolean().optional()
    .describe('Pause for user to select sub-questions before researching (default true; set false for agent use)'),
};

const chatHistorySchema = z
  .array(z.tuple([z.string(), z.string()]))
  .optional()
  .default([])
  .describe(
    'Chat history as [role, content] tuples, e.g. [["human","hi"],["assistant","hello"]]',
  );

const server = new FastMCP({
  name: 'perplexica',
  version: '4.0.0',
});

// ---------------------------------------------------------------------------
// Tool 1: verify_citations
// ---------------------------------------------------------------------------

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
    overrides: z.object(overridesSchema).optional().describe('Override individual parameters'),
  }),
  execute: async (args: {
    text: string;
    sources: Array<{ content: string; metadata: { title: string; url: string } }>;
    overrides?: Record<string, unknown>;
  }) => {
    const { text, sources, overrides } = args;
    const resolved = resolvePipelineConfig(
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

// ---------------------------------------------------------------------------
// Tool 2: extract_citations
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Tool 3: check_similarity
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Tool 4: search (consolidated: web + images + videos)
// ---------------------------------------------------------------------------

server.addTool({
  name: 'search',
  description: `Search using Perplexica. Use 'type' to select what to search:
- web (default): AI-generated answer with citations. Supports sources, systemInstructions, overrides, and embedding model params.
- images: Returns image URLs, source pages, and titles.
- videos: Returns video thumbnails, URLs, titles, and embed links.
All types accept: query, chatHistory, chatModelProvider, chatModelKey.`,
  parameters: z.object({
    query: z.string().describe('The search query'),
    type: z
      .enum(['web', 'images', 'videos'])
      .optional()
      .default('web')
      .describe('Search type: web (AI answer with citations), images, or videos'),
    // web-only params
    sources: z
      .array(z.enum(['web', 'discussions', 'academic']))
      .optional()
      .default(['web'])
      .describe('(web only) Source types to search'),
    systemInstructions: z
      .string()
      .optional()
      .describe('(web only) Custom system instructions for the AI writer'),
    overrides: z
      .object(overridesSchema)
      .optional()
      .describe('(web only) Pipeline parameter overrides'),
    embeddingModelProvider: z
      .string()
      .optional()
      .describe('(web only) Embedding model provider ID (auto-detected if omitted)'),
    embeddingModelKey: z
      .string()
      .optional()
      .describe('(web only) Embedding model key (auto-detected if omitted)'),
    // all types
    chatHistory: chatHistorySchema,
    chatModelProvider: z
      .string()
      .optional()
      .describe('Chat model provider ID (auto-detected if omitted)'),
    chatModelKey: z
      .string()
      .optional()
      .describe('Chat model key (auto-detected if omitted)'),
  }),
  execute: async (args) => {
    const type = args.type ?? 'web';

    if (type === 'web') {
      const models = await resolveModels({
        chatModelProvider: args.chatModelProvider,
        chatModelKey: args.chatModelKey,
        embeddingModelProvider: args.embeddingModelProvider,
        embeddingModelKey: args.embeddingModelKey,
      });

      const body: Record<string, unknown> = {
        query: args.query,
        sources: args.sources,
        history: args.chatHistory,
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
    }

    // images / videos — chat model only, no embedding needed
    const models = await resolveModels({
      chatModelProvider: args.chatModelProvider,
      chatModelKey: args.chatModelKey,
      requireEmbedding: false,
    });

    const endpoint = type === 'images' ? '/api/images' : '/api/videos';
    const result = await fetchJSON(endpoint, {
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

// ---------------------------------------------------------------------------
// Tool 5: chat (persistent DB conversation with full research capabilities)
// ---------------------------------------------------------------------------

server.addTool({
  name: 'chat',
  description: `Start or continue a persistent chat conversation with full research capabilities.
Unlike 'search' (stateless), 'chat' saves conversations to the database, supports multi-question
deep research, file attachments, and citation verification. Returns structured result with
chatId (use to continue the conversation), text, sources, and verificationSummary.
Set interactiveQuestions=false in overrides (the default for this tool) to skip the
120-second question-selection pause that is designed for human users.`,
  parameters: z.object({
    content: z.string().describe('The message to send'),
    chatId: z
      .string()
      .optional()
      .describe('Chat ID to continue an existing conversation (auto-generated UUID if omitted)'),
    messageId: z
      .string()
      .optional()
      .describe('Message ID (auto-generated UUID if omitted)'),
    sources: z
      .array(z.enum(['web', 'discussions', 'academic']))
      .optional()
      .default(['web'])
      .describe('Source types to search'),
    history: chatHistorySchema,
    systemInstructions: z
      .string()
      .optional()
      .describe('Custom system instructions for the AI writer'),
    overrides: z
      .object(overridesSchema)
      .optional()
      .describe('Pipeline parameter overrides. interactiveQuestions defaults to false for agent use.'),
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
  }),
  execute: async (args) => {
    const models = await resolveModels({
      chatModelProvider: args.chatModelProvider,
      chatModelKey: args.chatModelKey,
      embeddingModelProvider: args.embeddingModelProvider,
      embeddingModelKey: args.embeddingModelKey,
    });

    const chatId = args.chatId ?? randomUUID();
    const messageId = args.messageId ?? randomUUID();

    // Default interactiveQuestions=false for agent use (avoids 120s human selection timeout)
    const overrides: PipelineOverrides = {
      interactiveQuestions: false,
      ...(args.overrides as PipelineOverrides | undefined),
    };

    const body = {
      message: { messageId, chatId, content: args.content },
      sources: args.sources ?? ['web'],
      history: args.history ?? [],
      files: [],
      chatModel: models.chatModel,
      embeddingModel: models.embeddingModel,
      systemInstructions: args.systemInstructions ?? '',
      overrides,
    };

    const url = `${BASE_URL}/api/chat`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Perplexica chat API error ${res.status} ${res.statusText}: ${errText}`);
    }

    if (!res.body) {
      throw new Error('Perplexica chat API returned no response body');
    }

    // Read NDJSON stream, apply RFC 6902 patches, collect blocks
    const blockMap = new Map<string, Record<string, unknown>>();
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let streamDone = false;

    while (!streamDone) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        let msg: Record<string, unknown>;
        try {
          msg = JSON.parse(trimmed) as Record<string, unknown>;
        } catch {
          continue;
        }

        if (msg.type === 'block') {
          const block = msg.block as Record<string, unknown>;
          blockMap.set(block.id as string, block);
        } else if (msg.type === 'updateBlock') {
          const block = blockMap.get(msg.blockId as string);
          if (block) {
            applyPatch(block, msg.patch as Parameters<typeof applyPatch>[1]);
          }
        } else if (msg.type === 'messageEnd') {
          streamDone = true;
          break;
        } else if (msg.type === 'error') {
          throw new Error(`Chat stream error: ${JSON.stringify(msg.data)}`);
        }
      }
    }

    reader.cancel().catch(() => {});

    // Extract data from final block state
    let text = '';
    let sources: unknown[] = [];
    let verificationSummary: unknown = null;

    for (const block of blockMap.values()) {
      if (block.type === 'text') {
        text = block.data as string;
      } else if (block.type === 'source') {
        sources = block.data as unknown[];
      } else if (block.type === 'verification') {
        verificationSummary = block.data;
      }
    }

    return JSON.stringify({ chatId, text, sources, verificationSummary }, null, 2);
  },
});

// ---------------------------------------------------------------------------
// Tool 6: get_suggestions
// ---------------------------------------------------------------------------

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
    chatModelProvider: z
      .string()
      .optional()
      .describe('Chat model provider ID (auto-detected if omitted)'),
    chatModelKey: z
      .string()
      .optional()
      .describe('Chat model key (auto-detected if omitted)'),
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

// ---------------------------------------------------------------------------
// Tool 7: config (consolidated: get, update, test_searxng, resolve_pipeline)
// ---------------------------------------------------------------------------

server.addTool({
  name: 'config',
  description: `Manage Perplexica configuration. Actions:
- get: Get current config values, UI sections, and active providers.
- update: Update a single config key-value pair (requires: key, value). Use 'get' first to see available keys.
- test_searxng: Test connectivity to the SearXNG instance (optional: url to test a specific URL). Returns {ok, latencyMs?, message?}.
- resolve_pipeline: Resolve the full pipeline config for given overrides. Shows default values merged with any overrides.`,
  parameters: z.object({
    action: z.enum(['get', 'update', 'test_searxng', 'resolve_pipeline']),
    // update
    key: z.string().optional().describe('(update) Configuration key to update'),
    value: z.string().optional().describe('(update) New value for the configuration key'),
    // test_searxng
    url: z
      .string()
      .url()
      .optional()
      .describe('(test_searxng) SearXNG URL to test (uses configured URL if omitted)'),
    // resolve_pipeline
    overrides: z
      .object(overridesSchema)
      .optional()
      .describe('(resolve_pipeline) Override individual parameters'),
  }),
  execute: async (args) => {
    switch (args.action) {
      case 'get': {
        const result = await fetchJSON('/api/config');
        return JSON.stringify(result, null, 2);
      }
      case 'update': {
        if (!args.key || args.value === undefined) {
          throw new Error('update action requires key and value');
        }
        const result = await fetchJSON('/api/config', {
          method: 'POST',
          body: JSON.stringify({ key: args.key, value: args.value }),
        });
        return JSON.stringify(result, null, 2);
      }
      case 'test_searxng': {
        const body: Record<string, string> = {};
        if (args.url) body.url = args.url;
        const result = await fetchJSON('/api/config/test-searxng', {
          method: 'POST',
          body: JSON.stringify(body),
        });
        return JSON.stringify(result, null, 2);
      }
      case 'resolve_pipeline': {
        const resolved = resolvePipelineConfig(
          args.overrides as PipelineOverrides | undefined,
        );
        return JSON.stringify(resolved, null, 2);
      }
    }
  },
});

// ---------------------------------------------------------------------------
// Tool 8: providers (consolidated: list, add, update, delete, reload, add_model, delete_model)
// ---------------------------------------------------------------------------

server.addTool({
  name: 'providers',
  description: `Manage Perplexica model providers. Actions:
- list: List all configured providers with chat and embedding models.
- add: Add a new provider (requires: type, name, config).
- update: Update a provider's name or config (requires: providerId; optional: name, config).
- delete: Delete a provider (requires: providerId).
- reload: Refresh a provider's model list from source (requires: providerId). Useful after adding models to Ollama.
- add_model: Manually add a model to a provider (requires: providerId, modelType, key, modelName).
- delete_model: Remove a model from a provider (requires: providerId, modelType, key).`,
  parameters: z.object({
    action: z.enum(['list', 'add', 'update', 'delete', 'reload', 'add_model', 'delete_model']),
    // provider-level
    providerId: z
      .string()
      .optional()
      .describe('Provider ID (required for: update, delete, reload, add_model, delete_model)'),
    type: z
      .string()
      .optional()
      .describe('(add) Provider type, e.g. "openai", "anthropic", "ollama"'),
    name: z.string().optional().describe('(add/update) Provider display name'),
    config: z
      .record(z.string())
      .optional()
      .describe('(add/update) Provider-specific config (apiKey, baseUrl, etc.)'),
    // model-level
    modelType: z
      .enum(['chat', 'embedding'])
      .optional()
      .describe('(add_model/delete_model) Model type'),
    key: z
      .string()
      .optional()
      .describe('(add_model/delete_model) Model key/identifier, e.g. "gpt-4o"'),
    modelName: z.string().optional().describe('(add_model) Display name for the model'),
  }),
  execute: async (args) => {
    switch (args.action) {
      case 'list': {
        const result = await fetchJSON('/api/providers');
        return JSON.stringify(result, null, 2);
      }
      case 'add': {
        if (!args.type || !args.name || !args.config) {
          throw new Error('add action requires type, name, and config');
        }
        const result = await fetchJSON('/api/providers', {
          method: 'POST',
          body: JSON.stringify({ type: args.type, name: args.name, config: args.config }),
        });
        return JSON.stringify(result, null, 2);
      }
      case 'update': {
        if (!args.providerId) {
          throw new Error('update action requires providerId');
        }
        const body: Record<string, unknown> = {};
        if (args.name !== undefined) body.name = args.name;
        if (args.config !== undefined) body.config = args.config;
        const result = await fetchJSON(
          `/api/providers/${encodeURIComponent(args.providerId)}`,
          { method: 'PATCH', body: JSON.stringify(body) },
        );
        return JSON.stringify(result, null, 2);
      }
      case 'delete': {
        if (!args.providerId) {
          throw new Error('delete action requires providerId');
        }
        const result = await fetchJSON(
          `/api/providers/${encodeURIComponent(args.providerId)}`,
          { method: 'DELETE' },
        );
        return JSON.stringify(result, null, 2);
      }
      case 'reload': {
        if (!args.providerId) {
          throw new Error('reload action requires providerId');
        }
        const result = await fetchJSON(
          `/api/providers/${encodeURIComponent(args.providerId)}/reload`,
          { method: 'POST' },
        );
        return JSON.stringify(result, null, 2);
      }
      case 'add_model': {
        if (!args.providerId || !args.modelType || !args.key || !args.modelName) {
          throw new Error('add_model action requires providerId, modelType, key, and modelName');
        }
        const result = await fetchJSON(
          `/api/providers/${encodeURIComponent(args.providerId)}/models`,
          {
            method: 'POST',
            body: JSON.stringify({ type: args.modelType, key: args.key, name: args.modelName }),
          },
        );
        return JSON.stringify(result, null, 2);
      }
      case 'delete_model': {
        if (!args.providerId || !args.modelType || !args.key) {
          throw new Error('delete_model action requires providerId, modelType, and key');
        }
        const result = await fetchJSON(
          `/api/providers/${encodeURIComponent(args.providerId)}/models`,
          {
            method: 'DELETE',
            body: JSON.stringify({ type: args.modelType, key: args.key }),
          },
        );
        return JSON.stringify(result, null, 2);
      }
    }
  },
});

// ---------------------------------------------------------------------------
// Tool 9: chats (consolidated: list, get, delete)
// ---------------------------------------------------------------------------

server.addTool({
  name: 'chats',
  description: `Manage saved chat conversations. Actions:
- list: List all saved conversations.
- get: Get a specific conversation with all messages (requires: chatId).
- delete: Permanently delete a conversation (requires: chatId). Cannot be undone.`,
  parameters: z.object({
    action: z.enum(['list', 'get', 'delete']),
    chatId: z.string().optional().describe('Chat ID (required for: get, delete)'),
  }),
  execute: async (args) => {
    switch (args.action) {
      case 'list': {
        const result = await fetchJSON('/api/chats');
        return JSON.stringify(result, null, 2);
      }
      case 'get': {
        if (!args.chatId) {
          throw new Error('get action requires chatId');
        }
        const result = await fetchJSON(`/api/chats/${encodeURIComponent(args.chatId)}`);
        return JSON.stringify(result, null, 2);
      }
      case 'delete': {
        if (!args.chatId) {
          throw new Error('delete action requires chatId');
        }
        const result = await fetchJSON(
          `/api/chats/${encodeURIComponent(args.chatId)}`,
          { method: 'DELETE' },
        );
        return JSON.stringify(result, null, 2);
      }
    }
  },
});

server.start({
  transportType: 'stdio',
});
