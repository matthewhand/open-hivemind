import ConfigurationManager from '@common/config/ConfigurationManager';
import { OpenAiService } from '@src/integrations/openai/OpenAiService';
import Debug from 'debug';

const debug = Debug('app:getLlmProvider');

/**
 * Get LLM Provider
 *
 * Determines and returns the appropriate LLM provider singleton based on the
 * configuration specified in the ConfigurationManager. Supports multiple LLM
 * providers, such as OpenAI.
 *
 * @returns The singleton instance of the configured LLM provider.
 * @throws An error if the configured LLM provider is unsupported.
 */
export function getLlmProvider() {
  const configManager = new ConfigurationManager(); // Instantiate ConfigurationManager
  const llmProvider = configManager.LLM_PROVIDER;

  debug('Configured LLM provider:', llmProvider);

  // Guard: Ensure the LLM provider is specified
  if (!llmProvider) {
    throw new Error('LLM_PROVIDER is not configured.');
  }

  // Return the appropriate LLM provider based on configuration
  switch (llmProvider.toLowerCase()) {
    case 'openai':
      return OpenAiService.getInstance(); // Assuming OpenAiService is a singleton
    // Add additional cases for other providers here
    default:
      throw new Error(`Unsupported LLM provider: ${llmProvider}`);
  }
}