export { OpenSwarmProvider } from './OpenSwarmProvider';

import { OpenSwarmProvider } from './OpenSwarmProvider';
import type { PluginManifest } from '../../../src/plugins/PluginLoader';

/** Standard factory — preferred entry point for PluginLoader */
export function create(_config?: any): OpenSwarmProvider {
  return new OpenSwarmProvider();
}

export const manifest: PluginManifest = {
  displayName: 'OpenSwarm',
  description: 'Multi-agent orchestration via the OpenSwarm API',
  type: 'llm',
  minVersion: '1.0.0',
};
