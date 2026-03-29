/**
 * Memory Provider interface for persistent memory storage.
 *
 * Canonical contract that all memory provider packages must implement.
 * Aligned with the Mem0 API surface (add, search, getAll, get, update,
 * delete, deleteAll, healthCheck) which is the common denominator across
 * Mem0, Zep, Letta, and similar services.
 */

// ---------------------------------------------------------------------------
// Data types
// ---------------------------------------------------------------------------

/** A single stored memory entry returned by the provider. */
export interface MemoryEntry {
  /** Unique identifier for this memory */
  id: string;
  /** The text content of the memory */
  memory: string;
  /** Relevance score (populated in search results, 0-1) */
  score?: number;
  /** Arbitrary key-value metadata attached to the memory */
  metadata?: Record<string, unknown>;
}

/** Result set returned by add and search operations. */
export interface MemorySearchResult {
  results: MemoryEntry[];
}

// ---------------------------------------------------------------------------
// Provider interface
// ---------------------------------------------------------------------------

/**
 * Contract that all memory providers must implement.
 *
 * Methods mirror the common surface area found across Mem0, Zep, and
 * Letta: add, search, getAll, get, update, delete, deleteAll, and
 * healthCheck.
 */
export interface IMemoryProvider {
  /** Provider identifier */
  id: string;
  /** Display name */
  label: string;
  /** Provider type discriminant */
  type: 'memory';

  /**
   * Add memories from conversation messages.
   * @returns The created entries wrapped in a result set.
   */
  add(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    options?: { userId?: string; agentId?: string; metadata?: Record<string, any> },
  ): Promise<{
    results: Array<{ id: string; memory: string; score?: number; metadata?: Record<string, any> }>;
  }>;

  /**
   * Search memories by natural-language query.
   */
  search(
    query: string,
    options?: { userId?: string; agentId?: string; limit?: number },
  ): Promise<{
    results: Array<{ id: string; memory: string; score?: number; metadata?: Record<string, any> }>;
  }>;

  /**
   * Get all memories for a user/agent.
   */
  getAll(options?: {
    userId?: string;
    agentId?: string;
  }): Promise<{ results: Array<{ id: string; memory: string }> }>;

  /**
   * Get a specific memory by ID.
   */
  get(memoryId: string): Promise<{ id: string; memory: string } | null>;

  /**
   * Update a memory's content.
   */
  update(memoryId: string, newContent: string): Promise<{ id: string; memory: string }>;

  /**
   * Delete a specific memory.
   */
  delete(memoryId: string): Promise<void>;

  /**
   * Delete all memories for a user/agent.
   */
  deleteAll(options?: { userId?: string; agentId?: string }): Promise<void>;

  /**
   * Lightweight connectivity/readiness probe.
   * @returns `true` when the backing store is reachable.
   */
  healthCheck(): Promise<boolean>;
}
