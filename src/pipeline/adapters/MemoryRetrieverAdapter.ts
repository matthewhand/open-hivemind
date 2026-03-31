/**
 * Adapter that wraps {@link MemoryManager} as a pipeline
 * {@link MemoryRetriever}.
 *
 * Delegates `retrieveMemories()` to `MemoryManager.retrieveRelevantMemories()`
 * and maps the results to plain strings for the pipeline.
 *
 * @module pipeline/adapters/MemoryRetrieverAdapter
 */

import type { MemoryRetriever } from '@src/pipeline/EnrichStage';
import { MemoryManager } from '@src/services/MemoryManager';

/**
 * Optional dependencies — when omitted the adapter falls back to the
 * singleton {@link MemoryManager.getInstance()}.
 */
export interface MemoryRetrieverDeps {
  memoryManager?: MemoryManager;
}

/**
 * Adapts the singleton MemoryManager into the pipeline's
 * {@link MemoryRetriever} interface.
 */
export class MemoryRetrieverAdapter implements MemoryRetriever {
  private memoryManager: MemoryManager;

  constructor(deps: MemoryRetrieverDeps = {}) {
    this.memoryManager = deps.memoryManager ?? MemoryManager.getInstance();
  }

  async retrieveMemories(botName: string, query: string, limit?: number): Promise<string[]> {
    const results = await this.memoryManager.retrieveRelevantMemories(botName, query, limit);
    return results.map((r) => r.memory);
  }
}
