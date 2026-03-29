import { ConfigModelProvider } from '../config/types';
import BaseModelProvider, { createProviderInstance } from './base/provider';
import { getConfiguredModelProviders } from '../config/serverRegistry';
import { providers } from './providers';
import { MinimalProvider, ModelList } from './types';
import configManager from '../config';
import BaseLLM from './base/llm';
import BaseEmbedding from './base/embedding';

class ModelRegistry {
  activeProviders: (ConfigModelProvider & {
    provider: BaseModelProvider<any>;
  })[] = [];

  private chatModelCache = new Map<string, BaseLLM<any>>();
  private embeddingModelCache = new Map<string, BaseEmbedding<any>>();
  private modelListCache: { data: MinimalProvider[]; timestamp: number } | null =
    null;
  private readonly MODEL_LIST_TTL_MS = 5 * 60_000; // 5 minutes
  private isRevalidating = false;

  constructor() {
    this.initializeActiveProviders();
  }

  private initializeActiveProviders() {
    const configuredProviders = getConfiguredModelProviders();

    configuredProviders.forEach((p) => {
      try {
        const provider = providers[p.type];
        if (!provider) throw new Error('Invalid provider type');

        this.activeProviders.push({
          ...p,
          provider: createProviderInstance(provider, p.id, p.name, p.config),
        });
      } catch (err) {
        console.error(
          `Failed to initialize provider. Type: ${p.type}, ID: ${p.id}, Config: ${JSON.stringify(p.config)}, Error: ${err}`,
        );
      }
    });
  }

  async getActiveProviders() {
    const now = Date.now();
    const hasCache = this.modelListCache !== null;
    const isStale =
      hasCache &&
      now - this.modelListCache!.timestamp >= this.MODEL_LIST_TTL_MS;

    if (hasCache && !isStale) {
      return this.modelListCache!.data; // fresh — return immediately
    }

    if (hasCache && isStale && !this.isRevalidating) {
      // stale — return immediately, refresh in background
      this.isRevalidating = true;
      this.refreshAllProviders().finally(() => {
        this.isRevalidating = false;
      });
      return this.modelListCache!.data;
    }

    if (hasCache && this.isRevalidating) {
      return this.modelListCache!.data; // refresh in progress, use stale
    }

    // No cache — must wait (first load / after invalidation)
    return this.refreshAllProviders();
  }

  private async refreshAllProviders(): Promise<MinimalProvider[]> {
    const providerResults: MinimalProvider[] = [];

    await Promise.all(
      this.activeProviders.map(async (p) => {
        let m: ModelList = { chat: [], embedding: [] };

        try {
          m = await p.provider.getModelList();
        } catch (err: any) {
          console.error(
            `Failed to get model list. Type: ${p.type}, ID: ${p.id}, Error: ${err.message}`,
          );

          m = {
            chat: [
              {
                key: 'error',
                name: err.message,
              },
            ],
            embedding: [],
          };
        }

        providerResults.push({
          id: p.id,
          name: p.name,
          chatModels: m.chat,
          embeddingModels: m.embedding,
        });
      }),
    );

    this.modelListCache = { data: providerResults, timestamp: Date.now() };
    return providerResults;
  }

  async loadChatModel(providerId: string, modelName: string) {
    const cacheKey = `${providerId}::${modelName}`;
    const cached = this.chatModelCache.get(cacheKey);
    if (cached) return cached;

    const provider = this.activeProviders.find((p) => p.id === providerId);
    if (!provider) throw new Error('Invalid provider id');

    const model = await provider.provider.loadChatModel(modelName);
    this.chatModelCache.set(cacheKey, model);
    return model;
  }

  async loadEmbeddingModel(providerId: string, modelName: string) {
    const cacheKey = `${providerId}::${modelName}`;
    const cached = this.embeddingModelCache.get(cacheKey);
    if (cached) return cached;

    const provider = this.activeProviders.find((p) => p.id === providerId);
    if (!provider) throw new Error('Invalid provider id');

    const model = await provider.provider.loadEmbeddingModel(modelName);
    this.embeddingModelCache.set(cacheKey, model);
    return model;
  }

  async addProvider(
    type: string,
    name: string,
    config: Record<string, any>,
  ): Promise<ConfigModelProvider> {
    const provider = providers[type];
    if (!provider) throw new Error('Invalid provider type');

    const newProvider = configManager.addModelProvider(type, name, config);

    const instance = createProviderInstance(
      provider,
      newProvider.id,
      newProvider.name,
      newProvider.config,
    );

    let m: ModelList = { chat: [], embedding: [] };

    try {
      m = await instance.getModelList();
    } catch (err: any) {
      console.error(
        `Failed to get model list for newly added provider. Type: ${type}, ID: ${newProvider.id}, Error: ${err.message}`,
      );

      m = {
        chat: [
          {
            key: 'error',
            name: err.message,
          },
        ],
        embedding: [],
      };
    }

    this.activeProviders.push({
      ...newProvider,
      provider: instance,
    });
    this.modelListCache = null;

    return {
      ...newProvider,
      chatModels: m.chat || [],
      embeddingModels: m.embedding || [],
    };
  }

  async removeProvider(providerId: string): Promise<void> {
    configManager.removeModelProvider(providerId);
    this.activeProviders = this.activeProviders.filter(
      (p) => p.id !== providerId,
    );
    this._clearProviderCache(providerId);
    this.modelListCache = null;
    return;
  }

  private _clearProviderCache(providerId: string) {
    for (const key of this.chatModelCache.keys()) {
      if (key.startsWith(`${providerId}::`)) {
        this.chatModelCache.delete(key);
      }
    }
    for (const key of this.embeddingModelCache.keys()) {
      if (key.startsWith(`${providerId}::`)) {
        this.embeddingModelCache.delete(key);
      }
    }
  }

  async updateProvider(
    providerId: string,
    name: string,
    config: any,
  ): Promise<ConfigModelProvider> {
    this._clearProviderCache(providerId);
    const updated = await configManager.updateModelProvider(
      providerId,
      name,
      config,
    );
    const instance = createProviderInstance(
      providers[updated.type],
      providerId,
      name,
      config,
    );

    let m: ModelList = { chat: [], embedding: [] };

    try {
      m = await instance.getModelList();
    } catch (err: any) {
      console.error(
        `Failed to get model list for updated provider. Type: ${updated.type}, ID: ${updated.id}, Error: ${err.message}`,
      );

      m = {
        chat: [
          {
            key: 'error',
            name: err.message,
          },
        ],
        embedding: [],
      };
    }

    this.activeProviders.push({
      ...updated,
      provider: instance,
    });
    this.modelListCache = null;

    return {
      ...updated,
      chatModels: m.chat || [],
      embeddingModels: m.embedding || [],
    };
  }

  /* Using async here because maybe in the future we might want to add some validation?? */
  async addProviderModel(
    providerId: string,
    type: 'embedding' | 'chat',
    model: any,
  ): Promise<any> {
    const addedModel = configManager.addProviderModel(providerId, type, model);
    return addedModel;
  }

  async removeProviderModel(
    providerId: string,
    type: 'embedding' | 'chat',
    modelKey: string,
  ): Promise<void> {
    configManager.removeProviderModel(providerId, type, modelKey);
    return;
  }

  async refreshProvider(providerId: string): Promise<MinimalProvider> {
    this._clearProviderCache(providerId);
    this.modelListCache = null;

    const p = this.activeProviders.find((p) => p.id === providerId);
    if (!p) throw new Error('Provider not found');

    let m: ModelList = { chat: [], embedding: [] };
    try {
      m = await p.provider.getModelList();
    } catch (err: any) {
      m = { chat: [{ key: 'error', name: err.message }], embedding: [] };
    }

    return {
      id: p.id,
      name: p.name,
      chatModels: m.chat,
      embeddingModels: m.embedding,
    };
  }
}

export default ModelRegistry;

// Module-level singleton — shared across requests in the same server process.
// Existing mutation methods (addProvider, removeProvider, updateProvider) already
// update this.activeProviders in place, so the singleton stays current.
export const modelRegistry = new ModelRegistry();
