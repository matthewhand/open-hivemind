import { openAiProvider } from '@src/integrations/openai/openAiProvider';
import llmConfig from '@llm/interfaces/llmConfig';
import Debug from 'debug';

const debug = Debug('app:getLlmProvider');

/**
 * Returns the appropriate LLM provider based on configuration.
 * @returns {ILlmProvider} Selected LLM provider.
 */
export function getLlmProvider() {
  const provider = llmConfig.get('LLM_PROVIDER') || 'openai';  // Default to OpenAI
  debug('LLM Provider selected:', provider);
  switch (provider.toLowerCase()) {
    case 'openai':
      return openAiProvider;
    case 'flowise':
      // Add flowise provider when needed
      break;
    default:
      throw new Error(`Unknown LLM provider: ${provider}`);
  }
}
