import { ConfigurationManager } from '@config/ConfigurationManager';
import { openAiProvider } from '@integrations/openai/openAiProvider';
import { flowiseProvider } from '@integrations/flowise/flowiseProvider';

/**
 * Determines which LLM provider to use based on the configuration.
 * Returns either OpenAI or Flowise depending on the integration set for the channel.
 *
 * @param {string} channelId - The ID of the channel where the request is being made.
 * @returns {Function} The LLM provider function (OpenAI or Flowise).
 */
export function getLlmProvider(channelId: string): ILlmProvider {
  const configManager = ConfigurationManager.getInstance();
  const integration = configManager.getSession('llmIntegration', channelId) || 'openai'; // Default to OpenAI

  if (integration === 'flowise') {
    return flowiseProvider;
  }
  return openAiProvider;
}
