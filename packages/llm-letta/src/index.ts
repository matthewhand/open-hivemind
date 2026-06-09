import type { PluginManifest } from '../../../src/plugins/PluginLoader';
import { LettaProvider, type LettaProviderConfig } from './lettaProvider';

export { LettaProvider, LettaProviderConfig } from './lettaProvider';
export { listAgents, getAgent, type AgentSummary } from './agentBrowser';
export { schema } from './schema';

/**
 * Standard factory — preferred entry point for PluginLoader.
 * Returns a fresh provider per call so each bot keeps its own config
 * (agentId, auth, session mode, conversation cache) isolated.
 *
 * The PluginLoader passes config in two shapes: the plain provider keys
 * (`apiKey`/`baseUrl`) and the raw env-var names from the schema
 * (`LETTA_API_KEY`, `LETTA_BASE_URL`). Both are honored.
 */
export function create(
  config?: (LettaProviderConfig & Record<string, unknown>) | null
): LettaProvider {
  const c = (config ?? {}) as Record<string, unknown>;
  return new LettaProvider({
    ...(config ?? {}),
    apiKey: (c.apiKey as string) ?? (c.LETTA_API_KEY as string),
    baseUrl: (c.baseUrl as string) ?? (c.LETTA_BASE_URL as string),
  });
}

export const manifest: PluginManifest = {
  displayName: 'Letta',
  description: 'Stateful agents with persistent memory via the Letta API',
  type: 'llm',
  minVersion: '1.0.0',
};
