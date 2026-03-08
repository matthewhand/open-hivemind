export { LettaProvider, LettaProviderConfig } from './lettaProvider';

import { LettaProvider } from './lettaProvider';
import type { PluginManifest } from '../../../src/plugins/PluginLoader';

/** Standard factory — preferred entry point for PluginLoader */
export function create(config?: any): LettaProvider {
  return LettaProvider.getInstance(config);
}

export const manifest: PluginManifest = {
  displayName: 'Letta',
  description: 'Stateful agents with persistent memory via the Letta API',
  type: 'llm',
  minVersion: '1.0.0',
};
