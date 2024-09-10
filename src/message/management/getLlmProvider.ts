import { openAiProvider } from '@integrations/openai/openAiProvider';
import { flowiseProvider } from '@integrations/flowise/flowiseProvider'; // Assuming Flowise provider exists
import llmConfig from '@llm/interfaces/llmConfig';
import { ILlmProvider } from '@llm/interfaces/ILlmProvider';
import Debug from 'debug';

const debug = Debug('app:getLlmProvider');

/**
 * Returns the appropriate LLM provider based on configuration.
 * @returns {ILlmProvider} Selected LLM provider.
 */
export function getLlmProvider(channelId: string): ILlmProvider {
  const provider = llmConfig.get('LLM_PROVIDER') || 'openai';  // Defaults to OpenAI if not set
  debug('LLM Provider selected:', provider);

  switch (provider.toLowerCase()) {
    case 'openai':
      return openAiProvider;
    case 'flowise':
      return flowiseProvider;  // Use Flowise when configured
    default:
      throw new Error(`Unknown LLM provider: ${provider}`);
  }
}
