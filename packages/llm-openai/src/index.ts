import { OpenAiProvider } from './openAiProvider';
import type { PluginManifest } from '../../../src/plugins/PluginLoader';
import type { OpenAIConfig } from '../../../src/types/config';

export { OpenAiProvider, openAiProvider } from './openAiProvider';
export { default as openAiService, OpenAiService } from './OpenAiService';

/** Standard factory — preferred entry point for PluginLoader */
export function create(
  config?: OpenAIConfig & {
    timeout?: number;
    organization?: string;
    temperature?: number;
    maxTokens?: number;
  }
): OpenAiProvider {
  return new OpenAiProvider(config);
}

export const manifest: PluginManifest = {
  displayName: 'OpenAI',
  description: 'GPT models via the OpenAI API',
  type: 'llm',
  minVersion: '1.0.0',
};
