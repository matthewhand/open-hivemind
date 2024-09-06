import { OpenAiService } from '@src/integrations/openai/OpenAiService';
import Debug from 'debug';
import llmConfig from '@llm/interfaces/llmConfig';

const debug = Debug('app:getLlmProvider');

/**
 * Get LLM Provider
 *
 * Determines and returns the appropriate LLM provider singleton based on the
 * configuration specified in the convict-based llmConfig. Supports multiple LLM
 * providers, such as OpenAI.
 *
 * @returns The singleton instance of the configured LLM provider.
 * @throws An error if the configured LLM provider is unsupported.
 */
export function getLlmProvider() {
  // Guard: Ensure llmConfig is loaded and contains LLM_PROVIDER
  if (!llmConfig || !llmConfig.LLM_PROVIDER) {
    throw new Error('LLM configuration or LLM_PROVIDER is not loaded.');
  }

  const llmProvider = llmConfig.LLM_PROVIDER;

  // Improvement: Debug log to track the selected provider
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
