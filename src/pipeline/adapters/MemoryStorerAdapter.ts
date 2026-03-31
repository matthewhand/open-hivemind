/**
 * Adapter that wraps {@link MemoryManager.storeConversationMemory} as a
 * pipeline {@link MemoryStorer}.
 *
 * @module pipeline/adapters/MemoryStorerAdapter
 */

import type { MemoryStorer } from '@src/pipeline/SendStage';
import { MemoryManager } from '@src/services/MemoryManager';

/**
 * Optional dependencies — when omitted the adapter falls back to the
 * singleton {@link MemoryManager.getInstance()}.
 */
export interface MemoryStorerDeps {
  memoryManager?: MemoryManager;
}

/**
 * Adapts the singleton MemoryManager's store method into the pipeline's
 * {@link MemoryStorer} interface.
 */
export class MemoryStorerAdapter implements MemoryStorer {
  private memoryManager: MemoryManager;

  constructor(deps: MemoryStorerDeps = {}) {
    this.memoryManager = deps.memoryManager ?? MemoryManager.getInstance();
  }

  async storeMemory(
    botName: string,
    text: string,
    role: 'user' | 'assistant',
    meta?: Record<string, any>,
  ): Promise<void> {
    await this.memoryManager.storeConversationMemory(botName, text, role, meta);
  }
}
