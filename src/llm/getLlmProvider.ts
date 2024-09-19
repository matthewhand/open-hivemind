import { openAiProvider } from '@src/integrations/openai/openAiProvider';
import { flowiseProvider } from '@src/integrations/flowise/flowiseProvider';
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
      return flowiseProvider;
      break;
    default:
      throw new Error(`Unknown LLM provider: ${provider}`);
  }
}
