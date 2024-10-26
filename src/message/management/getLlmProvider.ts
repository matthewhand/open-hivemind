import { ILlmProvider } from '@llm/interfaces/ILlmProvider';
import FlowiseProvider from '@integrations/flowise/flowiseProvider';
import { openWebUIProvider } from '@integrations/openwebui/openWebUIProvider';
import { openAiProvider } from '@integrations/openai/openAiProvider';
import llmConfig from '@llm/interfaces/llmConfig';
import Debug from 'debug';

const debug = Debug('app:getLlmProvider');

/**
 * Returns the appropriate LLM provider based on configuration.
 * @returns {ILlmProvider} Selected LLM provider.
 */
export function getLlmProvider(): ILlmProvider {
  const provider = llmConfig.get('LLM_PROVIDER') || 'openai';
  debug('LLM Provider selected:', provider);

  let selectedProvider: ILlmProvider;

  switch (provider.toLowerCase()) {
    case 'flowise':
      selectedProvider = FlowiseProvider;
      break;
    case 'openwebui':
      selectedProvider = openWebUIProvider;
      break;
    case 'openai':
      selectedProvider = openAiProvider;
      break;
    default:
      throw new Error(`Unknown LLM provider: ${provider}`);
  }

  return selectedProvider;
}