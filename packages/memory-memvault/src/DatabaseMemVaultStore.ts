import type { MemVaultStore, StoredMemory } from './types';

/** Optional user/agent scope filter applied to list/clear operations. */
export interface MemVaultScopeFilter {
  userId?: string;
  agentId?: string;
}

/**
 * Duck-typed contract for the durable backend behind
 * {@link DatabaseMemVaultStore}.
 *
 * The host application's `DatabaseManager` (src/database/DatabaseManager.ts)
 * satisfies this interface structurally via its `*MemVaultMemory` methods,
 * which persist to the `memvault_memories` table created by migration 003.
 * Declared here so this package never imports host-application modules.
 */
export interface MemVaultDurableBackend {
  isConnected(): boolean;
  upsertMemVaultMemory(record: StoredMemory & { timestamp: number }): Promise<void>;
  getMemVaultMemory(id: string): Promise<(StoredMemory & { timestamp: number }) | null>;
  listMemVaultMemories(
    scope?: MemVaultScopeFilter
  ): Promise<(StoredMemory & { timestamp: number })[]>;
  deleteMemVaultMemory(id: string): Promise<boolean>;
  clearMemVaultMemories(scope?: MemVaultScopeFilter): Promise<number>;
}

/**
 * Returns true when `candidate` structurally satisfies
 * {@link MemVaultDurableBackend} (used by the plugin factory to decide whether
 * the injected database manager can act as MemVault's durable store).
 */
export function isMemVaultDurableBackend(candidate: unknown): candidate is MemVaultDurableBackend {
  if (candidate === null || typeof candidate !== 'object') {
    return false;
  }
  const obj = candidate as Record<string, unknown>;
  return (
    typeof obj.isConnected === 'function' &&
    typeof obj.upsertMemVaultMemory === 'function' &&
    typeof obj.getMemVaultMemory === 'function' &&
    typeof obj.listMemVaultMemories === 'function' &&
    typeof obj.deleteMemVaultMemory === 'function' &&
    typeof obj.clearMemVaultMemories === 'function'
  );
}

/**
 * Durable {@link MemVaultStore} backed by the host application's database
 * (SQLite/Postgres via `DatabaseManager`), with a write-through in-memory
 * cache on top.
 *
 * Semantics:
 * - **Writes** land in the cache first and are then written through to the
 *   backend. Backend failures are swallowed (debug-logged via the optional
 *   `onError` hook) so memory keeps working in-process; the record just
 *   won't survive a restart.
 * - **Reads** are served from the cache. The cache is hydrated from the
 *   backend once, lazily, on the first read — this is what restores memories
 *   after a restart.
 * - A native Postgres/pgvector store (server-side similarity search) remains
 *   deferred; scoring still happens in-process over the full candidate list.
 */
export class DatabaseMemVaultStore implements MemVaultStore {
  private readonly cache = new Map<string, StoredMemory>();
  private hydrated = false;
  private hydrating: Promise<void> | null = null;

  constructor(
    private readonly backend: MemVaultDurableBackend,
    private readonly onError: (operation: string, err: unknown) => void = () => {}
  ) {}

  async put(record: StoredMemory): Promise<void> {
    const stored: StoredMemory & { timestamp: number } = {
      ...record,
      timestamp: record.timestamp ?? Date.now(),
    };
    this.cache.set(stored.id, stored);
    try {
      await this.backend.upsertMemVaultMemory(stored);
    } catch (err) {
      this.onError('put', err);
    }
  }

  async get(id: string): Promise<StoredMemory | null> {
    const cached = this.cache.get(id);
    if (cached) {
      return { ...cached };
    }
    try {
      const found = await this.backend.getMemVaultMemory(id);
      if (found) {
        this.cache.set(found.id, found);
        return { ...found };
      }
    } catch (err) {
      this.onError('get', err);
    }
    return null;
  }

  async delete(id: string): Promise<boolean> {
    const removedFromCache = this.cache.delete(id);
    try {
      const removedFromBackend = await this.backend.deleteMemVaultMemory(id);
      return removedFromCache || removedFromBackend;
    } catch (err) {
      this.onError('delete', err);
      return removedFromCache;
    }
  }

  async list(scope?: MemVaultScopeFilter): Promise<StoredMemory[]> {
    await this.hydrate();
    const out: StoredMemory[] = [];
    for (const record of this.cache.values()) {
      if (matchesScope(record, scope)) {
        out.push({ ...record });
      }
    }
    return out;
  }

  async clear(scope?: MemVaultScopeFilter): Promise<number> {
    await this.hydrate();
    let removed = 0;
    for (const [id, record] of this.cache) {
      if (matchesScope(record, scope)) {
        this.cache.delete(id);
        removed++;
      }
    }
    try {
      await this.backend.clearMemVaultMemories(scope);
    } catch (err) {
      this.onError('clear', err);
    }
    return removed;
  }

  isReady(): boolean {
    // The cache always works; the backend only adds durability.
    return true;
  }

  /**
   * Load every persisted record into the cache exactly once. Concurrent
   * callers share the same in-flight hydration. A failed hydration is
   * retried on the next read.
   */
  private hydrate(): Promise<void> {
    if (this.hydrated) {
      return Promise.resolve();
    }
    if (!this.hydrating) {
      this.hydrating = (async () => {
        try {
          const records = await this.backend.listMemVaultMemories();
          for (const record of records) {
            // Cache wins: records written this session are newer than rows.
            if (!this.cache.has(record.id)) {
              this.cache.set(record.id, record);
            }
          }
          this.hydrated = true;
        } catch (err) {
          this.onError('hydrate', err);
        } finally {
          this.hydrating = null;
        }
      })();
    }
    return this.hydrating;
  }
}

function matchesScope(record: StoredMemory, scope?: MemVaultScopeFilter): boolean {
  if (!scope) {
    return true;
  }
  if (scope.userId != null && record.userId !== scope.userId) {
    return false;
  }
  if (scope.agentId != null && record.agentId !== scope.agentId) {
    return false;
  }
  return true;
}
