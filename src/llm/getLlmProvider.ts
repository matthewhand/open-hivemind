import Debug from 'debug';
import { ILlmProvider } from '@llm/interfaces/ILlmProvider';
import { IMessage } from '@message/interfaces/IMessage';
import { openAiProvider } from '@integrations/openai/openAiProvider';
import flowiseProvider from '@integrations/flowise/flowiseProvider';
import * as openWebUIImport from '@integrations/openwebui/runInference';
import llmConfig from '@config/llmConfig';

const debug = Debug('app:getLlmProvider');

// Wrap openWebUI to conform to ILlmProvider
const openWebUI: ILlmProvider = {
  supportsChatCompletion: () => true,
  supportsCompletion: () => false,
  generateChatCompletion: async (userMessage: string, historyMessages: IMessage[], metadata?: Record<string, any>) => {
    // Check if openWebUI supports metadata by inspecting parameter count
    if (openWebUIImport.generateChatCompletion.length === 3) {
      const result = await openWebUIImport.generateChatCompletion(userMessage, historyMessages, metadata);
      return result.text || '';
    } else {
      const result = await openWebUIImport.generateChatCompletion(userMessage, historyMessages);
      return result.text || '';
    }
  },
  generateCompletion: async (prompt: string) => {
    throw new Error('Non-chat completion not supported by OpenWebUI');
  },
};

/**
 * Returns an array of configured LLM providers based on the LLM_PROVIDER config.
 * @returns {ILlmProvider[]} Array of LLM providers.
 * @throws {Error} If no valid providers are configured.
 */
export function getLlmProvider(): ILlmProvider[] {
  const rawProvider = llmConfig.get('LLM_PROVIDER') as unknown;
  const providers = (typeof rawProvider === 'string'
    ? rawProvider.split(',').map((v: string) => v.trim())
    : Array.isArray(rawProvider)
      ? rawProvider
      : ['openai']) as string[];

  debug(`Configured LLM providers: ${providers.join(', ')}`);
  const llmProviders: ILlmProvider[] = [];

  providers.forEach((provider) => {
    try {
      switch (provider.toLowerCase()) {
        case 'openai':
          llmProviders.push(openAiProvider);
          debug('Initialized OpenAI provider');
          break;
        case 'flowise':
          llmProviders.push(flowiseProvider);
          debug('Initialized Flowise provider');
          break;
        case 'openwebui':
          llmProviders.push(openWebUI);
          debug('Initialized OpenWebUI provider');
          break;
        default:
          debug(`Unknown LLM provider: ${provider}, skipping`);
      }
    } catch (error) {
      debug(`Failed to initialize provider ${provider}: ${error}`);
    }
  });

  if (llmProviders.length === 0) {
    throw new Error('No valid LLM providers initialized');
  }

  return llmProviders;
}
