import Debug from 'debug';
import type { ILlmProvider } from '@llm/interfaces/ILlmProvider';
import type { IMessage } from '@message/interfaces/IMessage';
import { OpenAiProvider } from '@integrations/openai/openAiProvider';
import { FlowiseProvider } from '@integrations/flowise/flowiseProvider';
import * as openWebUIImport from '@integrations/openwebui/runInference';
import llmConfig from '@config/llmConfig';
import { MetricsCollector } from '@src/monitoring/MetricsCollector';
import ProviderConfigManager from '@src/config/ProviderConfigManager';

const debug = Debug('app:getLlmProvider');

function withTokenCounting(provider: ILlmProvider, instanceId: string): ILlmProvider {
  const metrics = MetricsCollector.getInstance();

  return {
    name: provider.name,
    supportsChatCompletion: provider.supportsChatCompletion,
    supportsCompletion: provider.supportsCompletion,
    // Add instance ID to provider object if interface allows, to help tracking?
    // For now we map it.
    generateChatCompletion: async (userMessage: string, historyMessages: IMessage[], metadata?: Record<string, any>) => {
      const response = await provider.generateChatCompletion(userMessage, historyMessages, metadata);
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
  generateChatCompletion: async (userMessage: string, historyMessages: IMessage[], metadata?: Record<string, any>) => {
    if (openWebUIImport.generateChatCompletion.length === 3) {
      const result = await openWebUIImport.generateChatCompletion(userMessage, historyMessages, metadata);
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
  const configuredProviders = providerManager.getAllProviders('llm').filter(p => p.enabled);

  const llmProviders: ILlmProvider[] = [];

  if (configuredProviders.length > 0) {
    // New System: Use configured instances
    configuredProviders.forEach(config => {
      try {
        let instance: ILlmProvider | undefined;
        switch (config.type.toLowerCase()) {
        case 'openai':
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
    });
  } 
  
  if (llmProviders.length === 0) {
    // Fallback: Check Legacy Env Var (LLM_PROVIDER)
    // This is necessary if no migration happened or it failed, or for quick development.
    const rawProvider = llmConfig.get('LLM_PROVIDER') as unknown;
    const legacyTypes = (typeof rawProvider === 'string'
      ? rawProvider.split(',').map((v: string) => v.trim())
      : Array.isArray(rawProvider) ? rawProvider : []) as string[];

    if (legacyTypes.length > 0 && legacyTypes[0] !== '') {
      debug(`Fallback to legacy LLM_PROVIDER env var: ${legacyTypes.join(',')}`);
      legacyTypes.forEach(type => {
        let instance: ILlmProvider | undefined;
        switch (type.toLowerCase()) {
        case 'openai': instance = new OpenAiProvider(); break;
        case 'flowise': instance = new FlowiseProvider(); break;
        case 'openwebui': instance = openWebUI; break;
        }
        if (instance) {llmProviders.push(withTokenCounting(instance, 'legacy'));}
      });
    }
  }

  if (llmProviders.length === 0) {
    // If still empty, default to OpenAI (legacy default)
    debug('No providers configured, defaulting to OpenAI (Legacy default)');
    llmProviders.push(withTokenCounting(new OpenAiProvider(), 'default'));
  }

  return llmProviders;
}
