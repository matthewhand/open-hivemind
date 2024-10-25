import FlowiseProvider from '../integrations/flowise/flowiseProvider';
import { generateChatCompletion } from '../integrations/openwebui/runInference';
import llmConfig from '@llm/interfaces/llmConfig';
import Debug from 'debug';

const debug = Debug('app:getLlmProvider');

export type LlmProviderType = typeof FlowiseProvider | { generateChatCompletion: (prompt: string, history?: string[]) => Promise<any> };

/**
 * Returns the appropriate LLM provider based on configuration.
 * @returns {LlmProviderType} Selected LLM provider.
 */
export function getLlmProvider(): LlmProviderType {
  const provider = llmConfig.get('LLM_PROVIDER') || 'openai';  // Default to OpenAI
  debug('LLM Provider selected:', provider);
  switch (provider.toLowerCase()) {
    case 'flowise':
      return FlowiseProvider;
    case 'openwebui':
      return { generateChatCompletion };
    default:
      throw new Error('Unknown LLM provider: ' + provider);
  }
}
