export { FlowiseProvider } from './flowiseProvider';
export { default as flowiseProvider } from './flowiseProvider';

import { FlowiseProvider } from './flowiseProvider';
import type { PluginManifest } from '../../../src/plugins/PluginLoader';

/** Standard factory — preferred entry point for PluginLoader */
export function create(config?: any): FlowiseProvider {
  return new FlowiseProvider(config);
}

export const manifest: PluginManifest = {
  displayName: 'Flowise',
  description: 'Visual LLM orchestration via the Flowise API',
  type: 'llm',
  minVersion: '1.0.0',
};
