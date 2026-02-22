import Debug from 'debug';
import ProviderConfigManager from '@src/config/ProviderConfigManager';
import { MetricsCollector } from '@src/monitoring/MetricsCollector';
import llmConfig from '@config/llmConfig';
import { FlowiseProvider } from '@hivemind/provider-flowise/flowiseProvider';
import * as openWebUIImport from '@hivemind/provider-openwebui/runInference';
import type { ILlmProvider } from '@llm/interfaces/ILlmProvider';
import type { IMessage } from '@message/interfaces/IMessage';
import type { IConfigAccessor } from '@src/types/configAccessor';

const debug = Debug('app:getLlmProvider');

function withTokenCounting(provider: ILlmProvider, instanceId: string): ILlmProvider {
  const metrics = MetricsCollector.getInstance();

  return {
    name: provider.name,
    supportsChatCompletion: provider.supportsChatCompletion,
    supportsCompletion: provider.supportsCompletion,
    // Add instance ID to provider object if interface allows, to help tracking?
    // For now we map it.
    generateChatCompletion: async (
      userMessage: string,
      historyMessages: IMessage[],
      metadata?: Record<string, any>
    ) => {
      const response = await provider.generateChatCompletion(
        userMessage,
        historyMessages,
        metadata
      );
      if (response) {
        metrics.recordLlmTokenUsage(response.length);
      }
      return response;
    },
    generateCompletion: async (userMessage: string) => {
      const response = await provider.generateCompletion(userMessage);
      if (response) {
        metrics.recordLlmTokenUsage(response.length);
      }
      return response;
    },
  };
}

const openWebUI: ILlmProvider = {
  name: 'openwebui',
  supportsChatCompletion: () => true,
  supportsCompletion: () => false,
  generateChatCompletion: async (
    userMessage: string,
    historyMessages: IMessage[],
    metadata?: Record<string, any>
  ) => {
    if (openWebUIImport.generateChatCompletion.length === 3) {
      const result = await openWebUIImport.generateChatCompletion(
        userMessage,
        historyMessages,
        metadata
      );
      return result.text || '';
    } else {
      const result = await openWebUIImport.generateChatCompletion(userMessage, historyMessages);
      return result.text || '';
    }
  },
  generateCompletion: async () => {
    throw new Error('Non-chat completion not supported by OpenWebUI');
  },
};

export function getLlmProvider(): ILlmProvider[] {
  const providerManager = ProviderConfigManager.getInstance();
  const configuredProviders = providerManager.getAllProviders('llm').filter((p) => p.enabled);

  const llmProviders: ILlmProvider[] = [];

  if (configuredProviders.length > 0) {
    // New System: Use configured instances
    for (const config of configuredProviders) {
      try {
        let instance: ILlmProvider | undefined;
        switch (config.type.toLowerCase()) {
          case 'openai':
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const { OpenAiProvider } = require('@hivemind/provider-openai');
            instance = new OpenAiProvider(config.config);
            debug(`Initialized OpenAI provider instance: ${config.name}`);
            break;
          case 'flowise':
            instance = new FlowiseProvider(config.config);
            debug(`Initialized Flowise provider instance: ${config.name}`);
            break;
          case 'openwebui':
            instance = openWebUI; // Singleton/Stateless
            debug(`Initialized OpenWebUI provider instance: ${config.name}`);
            break;
          default:
            debug(`Unknown LLM provider type: ${config.type}`);
        }

        if (instance) {
          // We could attach the instance ID to the provider object if we extend the interface
          // We wrap it to count tokens
          llmProviders.push(withTokenCounting(instance, config.id));
        }
      } catch (error) {
        debug(`Failed to initialize provider ${config.name}: ${error}`);
      }
    }
  }

  if (llmProviders.length === 0) {
    // Fallback: Check Legacy Env Var (LLM_PROVIDER)
    // This is necessary if no migration happened or it failed, or for quick development.
    const rawProvider: unknown = (llmConfig as unknown as IConfigAccessor).get('LLM_PROVIDER');
    const legacyTypes = (
      typeof rawProvider === 'string'
        ? rawProvider.split(',').map((v: string) => v.trim())
        : Array.isArray(rawProvider)
          ? rawProvider
          : []
    ) as string[];

    if (legacyTypes.length > 0 && legacyTypes[0] !== '') {
      debug(`Fallback to legacy LLM_PROVIDER env var: ${legacyTypes.join(',')}`);
      for (const type of legacyTypes) {
        let instance: ILlmProvider | undefined;
        switch (type.toLowerCase()) {
          case 'openai':
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const { OpenAiProvider } = require('@hivemind/provider-openai');
            instance = new OpenAiProvider();
            break;
          case 'flowise':
            instance = new FlowiseProvider();
            break;
          case 'openwebui':
            instance = openWebUI;
            break;
        }
        if (instance) {
          llmProviders.push(withTokenCounting(instance, 'legacy'));
        }
      }
    }
  }

  if (llmProviders.length === 0) {
    // If still empty, default to OpenAI (legacy default)
    debug('No providers configured, defaulting to OpenAI (Legacy default)');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { OpenAiProvider } = require('@hivemind/provider-openai');
    llmProviders.push(withTokenCounting(new OpenAiProvider(), 'default'));
  }

  return llmProviders;
}
