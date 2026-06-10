import Debug from 'debug';
import type { IDatabase as Database } from '../types';

const debug = Debug('app:MemVaultRepository');

/**
 * Row shape persisted in `memvault_memories` (see migration 003).
 *
 * Structurally identical to the MemVault package's `StoredMemory` — defined
 * here so the database layer does not depend on a plugin package. The field
 * names are kept in sync on purpose: `DatabaseManager` satisfies the
 * package's duck-typed durable-backend contract via these methods.
 */
export interface MemVaultMemoryRecord {
  /** UUID assigned by the MemVault provider. */
  id: string;
  content: string;
  /** Embedding vector (JSON-encoded in the TEXT column). */
  embedding: number[];
  /** Epoch-ms write timestamp used for recency decay. */
  timestamp: number;
  metadata?: Record<string, unknown>;
  userId?: string;
  agentId?: string;
}

/** Optional user/agent scope filter applied to list/clear operations. */
export interface MemVaultScope {
  userId?: string;
  agentId?: string;
}

/**
 * Repository for MemVault's durable memory store.
 *
 * Follows the BotTaskRepository pattern: closures over the live DB handle and
 * connection state, graceful no-ops when the database is unavailable (the
 * provider keeps working from its in-memory cache; memories just won't
 * survive a restart).
 */
export class MemVaultRepository {
  constructor(
    private getDb: () => Database | null,
    private isConnected: () => boolean,
    private isPostgres: () => boolean = () => false
  ) {}

  private mapRow(row: Record<string, any>): MemVaultMemoryRecord {
    const record: MemVaultMemoryRecord = {
      id: row.id,
      content: row.content,
      embedding: safeParseJson<number[]>(row.embedding) ?? [],
      timestamp: Number(row.timestamp),
    };
    const metadata = safeParseJson<Record<string, unknown>>(row.metadata);
    if (metadata !== null) record.metadata = metadata;
    if (row.userId !== null && row.userId !== undefined) record.userId = row.userId;
    if (row.agentId !== null && row.agentId !== undefined) record.agentId = row.agentId;
    return record;
  }

  /** Insert a memory or replace the existing row with the same id. */
  async upsert(record: MemVaultMemoryRecord): Promise<void> {
    const db = this.getDb();
    if (!db || !this.isConnected()) {
      debug('Database not connected, MemVault memory not stored');
      return;
    }

    // SQLite supports `INSERT OR REPLACE`; Postgres needs the equivalent
    // `ON CONFLICT (id) DO UPDATE` upsert (same split as BotTaskRepository).
    const sql = this.isPostgres()
      ? `
        INSERT INTO memvault_memories (
          id, content, embedding, timestamp, metadata, userId, agentId
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT (id) DO UPDATE SET
          content = EXCLUDED.content, embedding = EXCLUDED.embedding,
          timestamp = EXCLUDED.timestamp, metadata = EXCLUDED.metadata,
          userId = EXCLUDED.userId, agentId = EXCLUDED.agentId
      `
      : `
        INSERT OR REPLACE INTO memvault_memories (
          id, content, embedding, timestamp, metadata, userId, agentId
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `;

    await db.run(sql, [
      record.id,
      record.content,
      JSON.stringify(record.embedding),
      record.timestamp,
      record.metadata !== undefined ? JSON.stringify(record.metadata) : null,
      record.userId ?? null,
      record.agentId ?? null,
    ]);
    debug(`MemVault memory stored: ${record.id}`);
  }

  /** Load a single memory by id. */
  async getById(id: string): Promise<MemVaultMemoryRecord | null> {
    const db = this.getDb();
    if (!db || !this.isConnected()) {
      return null;
    }

    const row = await db.get(`SELECT * FROM memvault_memories WHERE id = ?`, [id]);
    return row ? this.mapRow(row) : null;
  }

  /** Load all memories matching the given scope (no scope = all rows). */
  async list(scope: MemVaultScope = {}): Promise<MemVaultMemoryRecord[]> {
    const db = this.getDb();
    if (!db || !this.isConnected()) {
      return [];
    }

    const { where, params } = buildScopeClause(scope);
    const rows = await db.all(
      `SELECT * FROM memvault_memories${where} ORDER BY timestamp ASC`,
      params
    );
    return rows.map((row) => this.mapRow(row));
  }

  /** Delete a memory by id. Returns true if a row was removed. */
  async deleteById(id: string): Promise<boolean> {
    const db = this.getDb();
    if (!db || !this.isConnected()) {
      return false;
    }

    const result = await db.run(`DELETE FROM memvault_memories WHERE id = ?`, [id]);
    return (result.changes ?? 0) > 0;
  }

  /** Delete all memories matching the given scope; returns the count removed. */
  async clear(scope: MemVaultScope = {}): Promise<number> {
    const db = this.getDb();
    if (!db || !this.isConnected()) {
      return 0;
    }

    const { where, params } = buildScopeClause(scope);
    const result = await db.run(`DELETE FROM memvault_memories${where}`, params);
    return result.changes ?? 0;
  }
}

function buildScopeClause(scope: MemVaultScope): { where: string; params: unknown[] } {
  const conditions: string[] = [];
  const params: unknown[] = [];
  if (scope.userId !== null && scope.userId !== undefined) {
    conditions.push('userId = ?');
    params.push(scope.userId);
  }
  if (scope.agentId !== null && scope.agentId !== undefined) {
    conditions.push('agentId = ?');
    params.push(scope.agentId);
  }
  return {
    where: conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : '',
    params,
  };
}

function safeParseJson<T>(value: unknown): T | null {
  if (typeof value !== 'string' || value.length === 0) {
    return null;
  }
  try {
    return JSON.parse(value) as T;
  } catch {
    debug('Failed to parse JSON column value');
    return null;
  }
}
