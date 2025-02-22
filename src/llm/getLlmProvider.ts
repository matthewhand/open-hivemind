import { openAiProvider } from '@src/integrations/openai/openAiProvider';
import flowiseProvider from '@src/integrations/flowise/flowiseProvider';
import * as openWebUIImport from '@src/integrations/openwebui/runInference';
import llmConfig from '@llm/interfaces/llmConfig';
import Debug from 'debug';
import { ILlmProvider } from '@llm/interfaces/ILlmProvider';
import { IMessage } from '@src/message/interfaces/IMessage';

const debug = Debug('app:getLlmProvider');

// Wrap openWebUI to conform to ILlmProvider
const openWebUI: ILlmProvider = {
  supportsChatCompletion: () => true,
  supportsCompletion: () => false, // openWebUI only supports chat completions
  generateChatCompletion: (userMessage: string, historyMessages: IMessage[]) => 
    openWebUIImport.generateChatCompletion(userMessage, historyMessages).then(result => result.text || ''),
  generateCompletion: async (prompt: string) => {
    throw new Error('Non-chat completion not supported by OpenWebUI');
  }
};

/**
 * Returns the appropriate LLM provider based on configuration.
 * @returns {ILlmProvider} Selected LLM provider.
 */
export function getLlmProvider(): ILlmProvider {
  const rawProvider = llmConfig.get('LLM_PROVIDER') as unknown; // Avoid direct string cast
  const providers = (typeof rawProvider === 'string' 
    ? rawProvider.split(',').map((v: string) => v.trim()) 
    : Array.isArray(rawProvider) 
      ? rawProvider 
      : ['openai']) as string[]; // Fallback to 'openai' if invalid
  const provider = providers[0]; // Use the first provider
  debug('LLM Provider selected:', provider);

  switch (provider.toLowerCase()) {
    case 'openai':
      return openAiProvider;
    case 'flowise':
      return flowiseProvider;
    case 'openwebui':
      return openWebUI;
    default:
      throw new Error('Unknown LLM provider: ' + provider);
  }
}
