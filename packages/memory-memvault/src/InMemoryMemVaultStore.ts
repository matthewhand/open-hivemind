import type { MemVaultStore, StoredMemory } from './types';

/**
 * Default, dependency-free {@link MemVaultStore} implementation.
 *
 * Records live in a Map keyed by id. This keeps the MemVault provider fully
 * functional and testable without requiring Postgres/pgvector infrastructure.
 * It is process-local and non-durable — suitable for development, tests, and
 * single-process deployments.
 */
export class InMemoryMemVaultStore implements MemVaultStore {
  private readonly records = new Map<string, StoredMemory>();

  async put(record: StoredMemory): Promise<void> {
    // Store a shallow copy so external mutation of the input does not leak in.
    this.records.set(record.id, { ...record });
  }

  async get(id: string): Promise<StoredMemory | null> {
    const found = this.records.get(id);
    return found ? { ...found } : null;
  }

  async delete(id: string): Promise<boolean> {
    return this.records.delete(id);
  }

  async list(scope?: { userId?: string; agentId?: string }): Promise<StoredMemory[]> {
    const out: StoredMemory[] = [];
    for (const record of this.records.values()) {
      if (matchesScope(record, scope)) {
        out.push({ ...record });
      }
    }
    return out;
  }

  async clear(scope?: { userId?: string; agentId?: string }): Promise<number> {
    let removed = 0;
    for (const [id, record] of this.records) {
      if (matchesScope(record, scope)) {
        this.records.delete(id);
        removed++;
      }
    }
    return removed;
  }

  isReady(): boolean {
    return true;
  }
}

function matchesScope(
  record: StoredMemory,
  scope?: { userId?: string; agentId?: string }
): boolean {
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
