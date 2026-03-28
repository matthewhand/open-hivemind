/**
 * Memory Provider interface for persistent memory storage.
 *
 * Canonical definition — all memory provider packages should implement this
 * contract so they can be used interchangeably by the plugin system.
 *
 * This is the superset interface that unifies:
 *   - The simple content-based API (addMemory, searchMemories, etc.)
 *   - The conversation-context API (add with messages array, search, etc.)
 *
 * Providers may implement either style; callers should use the style that
 * matches their use-case.
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

/** Options shared across memory operations that scope by user/agent/session. */
export interface MemoryScopeOptions {
  userId?: string;
  agentId?: string;
  sessionId?: string;
}

// ---------------------------------------------------------------------------
// Provider interface
// ---------------------------------------------------------------------------

/**
 * Contract that all memory providers must implement.
 *
 * Methods mirror the common surface area found across Mem0, Mem4ai, MemVault,
 * Zep, and Letta: add, search, list, get-by-id, update, delete, bulk-delete,
 * and health-check.
 */
export interface IMemoryProvider {
  /**
   * Add a new memory from plain text content.
   *
   * @param content  The text to store.
   * @param metadata Optional key-value metadata to attach.
   * @param options  Scoping options (userId, agentId, sessionId).
   * @returns The created entry with its assigned id.
   */
  addMemory(
    content: string,
    metadata?: Record<string, unknown>,
    options?: MemoryScopeOptions
  ): Promise<MemoryEntry>;

  /**
   * Search memories by natural-language query.
   *
   * @param query   Free-text search string.
   * @param options Search parameters: limit, threshold, and scope.
   */
  searchMemories(
    query: string,
    options?: { limit?: number; threshold?: number } & MemoryScopeOptions
  ): Promise<MemorySearchResult>;

  /**
   * List memories, optionally scoped to a user/agent.
   *
   * @param options Listing parameters: limit and scope.
   */
  getMemories(
    options?: { limit?: number } & MemoryScopeOptions
  ): Promise<MemoryEntry[]>;

  /**
   * Retrieve a single memory by ID.
   *
   * @param id The memory's unique identifier.
   * @returns The entry, or null if not found.
   */
  getMemory(id: string): Promise<MemoryEntry | null>;

  /**
   * Update the content and optionally the metadata of an existing memory.
   *
   * @param id       The memory's unique identifier.
   * @param content  New text content.
   * @param metadata Optional replacement metadata.
   */
  updateMemory(
    id: string,
    content: string,
    metadata?: Record<string, unknown>
  ): Promise<MemoryEntry>;

  /**
   * Delete a single memory by ID.
   *
   * @param id The memory's unique identifier.
   */
  deleteMemory(id: string): Promise<void>;

  /**
   * Delete all memories matching the given scope.
   *
   * @param options Scope to constrain the deletion.
   */
  deleteAll(options?: MemoryScopeOptions): Promise<void>;

  /**
   * Lightweight connectivity/readiness probe.
   */
  healthCheck(): Promise<{ status: 'ok' | 'error'; details?: Record<string, unknown> }>;
}
