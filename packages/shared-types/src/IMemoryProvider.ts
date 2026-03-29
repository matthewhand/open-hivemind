/**
 * Memory Provider interface for persistent memory storage.
 *
 * Extracted from the common patterns across memory-mem0, memory-mem4ai, and
 * memory-memvault providers. Future memory provider packages should implement
 * this contract so they can be used interchangeably by the plugin system.
 */

// ---------------------------------------------------------------------------
// Data types
// ---------------------------------------------------------------------------

/** A single stored memory entry. */
export interface MemoryEntry {
  /** Unique identifier for this memory */
  id: string;
  /** The text content of the memory */
  content: string;
  /** Relevance score (populated in search results, 0-1) */
  score?: number;
  /** Arbitrary key-value metadata attached to the memory */
  metadata?: Record<string, unknown>;
  /** Creation/update timestamp in epoch milliseconds */
  timestamp?: number;
  /** Tags or labels for categorisation */
  tags?: string[];
  /** The user this memory belongs to */
  userId?: string;
  /** The agent this memory belongs to */
  agentId?: string;
}

/** Result set returned by search and list operations. */
export interface MemorySearchResult {
  results: MemoryEntry[];
}

// ---------------------------------------------------------------------------
// Provider interface
// ---------------------------------------------------------------------------

/**
 * Contract that all memory providers must implement.
 *
 * Methods mirror the common surface area found across Mem0, Mem4ai, and
 * MemVault: add, search, list, get-by-id, update, delete, and health-check.
 */
export interface IMemoryProvider {
  /**
   * Add a new memory.
   * @returns The created entry (or entries wrapped in a search result).
   */
  addMemory(
    content: string,
    metadata?: Record<string, unknown>,
    userId?: string
  ): Promise<MemoryEntry>;

  /**
   * Search memories by natural-language query.
   * @param query  Free-text search string.
   * @param limit  Maximum number of results to return.
   * @param userId Optional scope to a single user.
   */
  searchMemories(query: string, limit?: number, userId?: string): Promise<MemoryEntry[]>;

  /**
   * List memories, optionally scoped to a user.
   * @param limit  Maximum number of results.
   * @param userId Optional user scope.
   */
  getMemories(limit?: number, userId?: string): Promise<MemoryEntry[]>;

  /**
   * Delete a single memory by ID.
   * @returns `true` if the deletion succeeded.
   */
  deleteMemory(id: string): Promise<boolean>;

  /**
   * Update the content (and optionally metadata) of an existing memory.
   * @returns The updated entry.
   */
  updateMemory(
    id: string,
    content: string,
    metadata?: Record<string, unknown>
  ): Promise<MemoryEntry>;

  /**
   * Lightweight connectivity/readiness probe.
   * @returns `true` when the backing store is reachable.
   */
  healthCheck(): Promise<boolean>;
}
