/**
 * @hivemind/memory-mem0
 *
 * Mem0 memory provider for Open Hivemind.
 * Connects to the mem0.ai REST API (or a self-hosted instance) to provide
 * persistent, searchable memory for AI agents.
 */

export { Mem0Provider } from './Mem0Provider';
export type {
  Mem0Config,
  Mem0Memory,
  Mem0AddResponse,
  Mem0ListResponse,
  Mem0SearchResponse,
  Mem0GetResponse,
  Mem0UpdateResponse,
} from './types';
export { Mem0ApiError } from './types';

// ---------------------------------------------------------------------------
// Plugin manifest & factory (PluginLoader contract)
// ---------------------------------------------------------------------------

import type { Mem0Config } from './types';
import { Mem0Provider } from './Mem0Provider';

export const manifest = {
  displayName: 'Mem0',
  description: 'Persistent memory for AI agents via the Mem0 REST API',
  type: 'memory' as const,
};

/**
 * Factory function called by the PluginLoader.
 *
 * Accepts the same config fields that the UI schema (mem0.ts) exposes so
 * values flow through unchanged.
 */
export function create(config: Mem0Config): Mem0Provider {
  return new Mem0Provider(config);
}
