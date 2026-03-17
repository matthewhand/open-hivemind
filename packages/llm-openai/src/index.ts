export * from './openAiProvider';
export { default as openAiService, OpenAiService } from './OpenAiService';

import { OpenAiProvider } from './openAiProvider';
>>>>>>> origin/jules-responsive-layout-consistency-5760872167389438897
import type { PluginManifest } from '../../../src/plugins/PluginLoader';
import type { OpenAIConfig } from '../../../src/types/config';
import { OpenAiProvider } from './openAiProvider';

export * from './openAiProvider';
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
