import type { PluginManifest } from '../../../src/plugins/PluginLoader';
import { LettaProvider } from './lettaProvider';

export { LettaProvider, LettaProviderConfig } from './lettaProvider';
export { listAgents, getAgent, type AgentSummary } from './agentBrowser';

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
