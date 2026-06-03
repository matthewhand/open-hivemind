import type { PluginManifest } from '../../../src/plugins/PluginLoader';
import { LettaProvider } from './lettaProvider';

export { LettaProvider, LettaProviderConfig } from './lettaProvider';
export { listAgents, getAgent, type AgentSummary } from './agentBrowser';
export { schema } from './schema';

/**
 * Standard factory — preferred entry point for PluginLoader.
 * Returns a fresh provider per call so each bot keeps its own config
 * (agentId, session mode, conversation cache) isolated.
 */
export function create(config?: any): LettaProvider {
  return new LettaProvider(config);
}

export const manifest: PluginManifest = {
  displayName: 'Letta',
  description: 'Stateful agents with persistent memory via the Letta API',
  type: 'llm',
  minVersion: '1.0.0',
};
