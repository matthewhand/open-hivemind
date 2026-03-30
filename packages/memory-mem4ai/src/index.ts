// ---------------------------------------------------------------------------
// Plugin manifest & factory (PluginLoader contract)
// ---------------------------------------------------------------------------

import { Mem4aiProvider } from './Mem4aiProvider';
import type { Mem4aiConfig } from './types';

/**
 * @hivemind/memory-mem4ai
 *
 * Mem4ai memory provider for Open Hivemind.
 * Connects to the Mem4ai REST API to provide persistent, searchable
 * memory with adaptive personalization for AI agents.
 */

export { Mem4aiProvider } from './Mem4aiProvider';
export type {
  Mem4aiConfig,
  Mem4aiMemory,
  Mem4aiAddResponse,
  Mem4aiListResponse,
  Mem4aiSearchResponse,
  Mem4aiGetResponse,
  Mem4aiUpdateResponse,
} from './types';
export { Mem4aiApiError } from './types';

export const manifest = {
  displayName: 'Mem4ai',
  description:
    'LLM-friendly memory management with adaptive personalization via the Mem4ai REST API',
  type: 'memory' as const,
};

/**
 * Factory function called by the PluginLoader.
 *
 * Accepts the same config fields that the UI schema (mem4ai.ts) exposes so
 * values flow through unchanged.
 */
export function create(config: Mem4aiConfig): Mem4aiProvider {
  return new Mem4aiProvider(config);
}
