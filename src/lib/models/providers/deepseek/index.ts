import { UIConfigField } from '@/lib/config/types';
import { getConfiguredModelProviderById } from '@/lib/config/serverRegistry';
import { Model, ModelList, ProviderMetadata } from '../../types';
import BaseEmbedding from '../../base/embedding';
import BaseModelProvider from '../../base/provider';
import BaseLLM from '../../base/llm';
import DeepseekLLM from './deepseekLLM';

interface DeepseekConfig {
  apiKey: string;
}

const providerConfigFields: UIConfigField[] = [
  {
    type: 'password',
    name: 'API Key',
    key: 'apiKey',
    description: 'Your DeepSeek API key',
    required: true,
    placeholder: 'DeepSeek API Key',
    env: 'DEEPSEEK_API_KEY',
    scope: 'server',
  },
];

class DeepseekProvider extends BaseModelProvider<DeepseekConfig> {
  constructor(id: string, name: string, config: DeepseekConfig) {
    super(id, name, config);
  }

  async getDefaultModels(): Promise<ModelList> {
    const res = await fetch(`https://api.deepseek.com/v1/models`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`,
      },
    });

    const data = await res.json();

    const defaultChatModels: Model[] = [];

    data.data.forEach((m: any) => {
      defaultChatModels.push({
        key: m.id,
        name: m.id,
      });
    });

    return {
      embedding: [],
      chat: defaultChatModels,
    };
  }

  async getModelList(): Promise<ModelList> {
    const defaultModels = await this.getDefaultModels();
    const configProvider = getConfiguredModelProviderById(this.id)!;

    return {
      embedding: [
        ...defaultModels.embedding,
        ...configProvider.embeddingModels,
      ],
      chat: [...defaultModels.chat, ...configProvider.chatModels],
    };
  }

  async loadChatModel(key: string): Promise<BaseLLM<any>> {
    const modelList = await this.getModelList();

    const exists = modelList.chat.find((m) => m.key === key);

    if (!exists) {
      throw new Error(
        'Error Loading DeepSeek Chat Model. Invalid Model Selected',
      );
    }

    return new DeepseekLLM({
      apiKey: this.config.apiKey,
      model: key,
      baseURL: 'https://api.deepseek.com/v1',
    });
  }

  async loadEmbeddingModel(key: string): Promise<BaseEmbedding<any>> {
    throw new Error('DeepSeek Provider does not support embedding models.');
  }

  static parseAndValidate(raw: any): DeepseekConfig {
    if (!raw || typeof raw !== 'object')
      throw new Error('Invalid config provided. Expected object');
    if (!raw.apiKey)
      throw new Error('Invalid config provided. API key must be provided');

    return {
      apiKey: String(raw.apiKey),
    };
  }

  static getProviderConfigFields(): UIConfigField[] {
    return providerConfigFields;
  }

  static getProviderMetadata(): ProviderMetadata {
    return {
      key: 'deepseek',
      name: 'DeepSeek',
    };
  }
}

export default DeepseekProvider;
