import type { PluginManifest } from '../../../src/plugins/PluginLoader';
import { OpenSwarmProvider, type OpenSwarmConfig } from './OpenSwarmProvider';

export { OpenSwarmProvider, type OpenSwarmConfig } from './OpenSwarmProvider';
export { SwarmInstaller } from './SwarmInstaller';
export { schema } from './schema';

/**
 * Standard factory — preferred entry point for PluginLoader.
 *
 * Accepts an optional per-bot config so callers can override `baseUrl`,
 * `apiKey`, and `team`. The PluginLoader passes config in two shapes:
 * the plain provider keys (`baseUrl`/`apiKey`/`team`) and the raw env-var
 * names from the schema (`OPENSWARM_BASE_URL`, etc.). Both are honored.
 */
export function create(
  config?: (OpenSwarmConfig & Record<string, unknown>) | null
): OpenSwarmProvider {
  const c = (config ?? {}) as Record<string, unknown>;
  return new OpenSwarmProvider({
    baseUrl: (c.baseUrl as string) ?? (c.OPENSWARM_BASE_URL as string),
    apiKey: (c.apiKey as string) ?? (c.OPENSWARM_API_KEY as string),
    team: (c.team as string) ?? (c.OPENSWARM_TEAM as string),
  });
}

export const manifest: PluginManifest = {
  displayName: 'OpenSwarm',
  description: 'Multi-agent orchestration via the OpenSwarm API',
  type: 'llm',
  minVersion: '1.0.0',
};
