export * from './openAiProvider';
export { default as openAiService, OpenAiService } from './OpenAiService';

import { OpenAiProvider } from './openAiProvider';
import type { PluginManifest } from '../../../src/plugins/PluginLoader';

/** Standard factory — preferred entry point for PluginLoader */
export function create(config?: any): OpenAiProvider {
  return new OpenAiProvider(config);
}

export const manifest: PluginManifest = {
  displayName: 'OpenAI',
  description: 'GPT models via the OpenAI API',
  type: 'llm',
  minVersion: '1.0.0',
};
