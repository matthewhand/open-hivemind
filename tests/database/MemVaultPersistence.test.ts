/**
 * MemVault durable-store persistence round-trip.
 *
 * Uses a REAL SQLite engine (node:sqlite, unaffected by the better-sqlite3
 * jest mock) with the real 003 migration applied, the real MemVaultRepository
 * issuing real SQL, and the real DatabaseMemVaultStore on top — then
 * simulates a process restart by constructing a fresh store (empty cache)
 * over the same database and asserting the memories come back.
 */

import { createRequire } from 'node:module';
import type { DatabaseSync } from 'node:sqlite';
import {
  DatabaseMemVaultStore,
  type MemVaultDurableBackend,
  type StoredMemory,
} from '@hivemind/memory-memvault';
import { down, up } from '@src/database/migrations/003_add_memvault_memories';
import {
  MemVaultRepository,
  type MemVaultScope,
} from '@src/database/repositories/MemVaultRepository';
import type { IDatabase } from '@src/database/types';

// Jest's module registry predates node:sqlite; createRequire loads the real
// core module directly, bypassing jest's resolver.
const nodeRequire = createRequire(__filename);
const { DatabaseSync: NodeSqlite } = nodeRequire('node:sqlite') as {
  DatabaseSync: new (path: string) => DatabaseSync;
};

/** Minimal IDatabase adapter over node:sqlite for migration + repository SQL. */
class NodeSqliteAdapter implements IDatabase {
  constructor(private db: DatabaseSync) {}

  async run(
    sql: string,
    params: any[] = []
  ): Promise<{ lastID: number | string; changes: number }> {
    const result = this.db.prepare(sql).run(...params);
    return { lastID: Number(result.lastInsertRowid), changes: Number(result.changes) };
  }

  async all<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    return this.db.prepare(sql).all(...params) as T[];
  }

  async get<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
    return this.db.prepare(sql).get(...params) as T | undefined;
  }

  async exec(sql: string): Promise<void> {
    this.db.exec(sql);
  }

  async transaction<T>(callback: (db: IDatabase) => Promise<T>): Promise<T> {
    return callback(this);
  }

  async close(): Promise<void> {
    this.db.close();
  }
}

/** Backend mirroring DatabaseManager's MemVault surface, over the repository. */
function makeBackend(repo: MemVaultRepository): MemVaultDurableBackend {
  return {
    isConnected: () => true,
    upsertMemVaultMemory: (record) => repo.upsert(record as any),
    getMemVaultMemory: (id) => repo.getById(id) as any,
    listMemVaultMemories: (scope?: MemVaultScope) => repo.list(scope) as any,
    deleteMemVaultMemory: (id) => repo.deleteById(id),
    clearMemVaultMemories: (scope?: MemVaultScope) => repo.clear(scope),
  };
}

function makeMemory(overrides: Partial<StoredMemory> = {}): StoredMemory {
  return {
    id: 'mem-1',
    content: 'the user prefers tabs',
    embedding: [0.1, 0.2, 0.3],
    timestamp: 1750000000000,
    metadata: { botName: 'TestBot' },
    userId: 'u1',
    agentId: 'agent-1',
    ...overrides,
  };
}

describe('MemVault durable persistence (real SQLite + migration 003)', () => {
  let db: NodeSqliteAdapter;
  let repo: MemVaultRepository;

  beforeEach(async () => {
    db = new NodeSqliteAdapter(new NodeSqlite(':memory:'));
    await up({ db, isPostgres: false });
    repo = new MemVaultRepository(
      () => db,
      () => true,
      () => false
    );
  });

  afterEach(async () => {
    await db.close();
  });

  it('round-trips a memory through the database and survives a simulated restart', async () => {
    const storeBeforeRestart = new DatabaseMemVaultStore(makeBackend(repo));
    await storeBeforeRestart.put(makeMemory());
    await storeBeforeRestart.put(
      makeMemory({ id: 'mem-2', content: 'project deadline is friday', userId: 'u2' })
    );

    // "Restart": brand-new store with an empty cache over the same database.
    const storeAfterRestart = new DatabaseMemVaultStore(makeBackend(repo));

    const all = await storeAfterRestart.list();
    expect(all).toHaveLength(2);

    const restored = await storeAfterRestart.get('mem-1');
    expect(restored).toMatchObject({
      id: 'mem-1',
      content: 'the user prefers tabs',
      embedding: [0.1, 0.2, 0.3],
      timestamp: 1750000000000,
      metadata: { botName: 'TestBot' },
      userId: 'u1',
      agentId: 'agent-1',
    });
  });

  it('applies user/agent scope filters to list() after rehydration', async () => {
    const store = new DatabaseMemVaultStore(makeBackend(repo));
    await store.put(makeMemory({ id: 'a', userId: 'u1', agentId: 'bot-a' }));
    await store.put(makeMemory({ id: 'b', userId: 'u2', agentId: 'bot-a' }));
    await store.put(makeMemory({ id: 'c', userId: 'u1', agentId: 'bot-b' }));

    const fresh = new DatabaseMemVaultStore(makeBackend(repo));
    const u1 = await fresh.list({ userId: 'u1' });
    expect(u1.map((m) => m.id).sort()).toEqual(['a', 'c']);

    const botA = await fresh.list({ agentId: 'bot-a' });
    expect(botA.map((m) => m.id).sort()).toEqual(['a', 'b']);
  });

  it('persists deletes and scoped clears', async () => {
    const store = new DatabaseMemVaultStore(makeBackend(repo));
    await store.put(makeMemory({ id: 'a', agentId: 'bot-a' }));
    await store.put(makeMemory({ id: 'b', agentId: 'bot-b' }));
    await store.put(makeMemory({ id: 'c', agentId: 'bot-b' }));

    await expect(store.delete('a')).resolves.toBe(true);
    await expect(store.clear({ agentId: 'bot-b' })).resolves.toBe(2);

    const fresh = new DatabaseMemVaultStore(makeBackend(repo));
    await expect(fresh.list()).resolves.toEqual([]);
    await expect(repo.list()).resolves.toEqual([]);
  });

  it('upserts: putting the same id twice replaces the row instead of duplicating it', async () => {
    await repo.upsert(makeMemory({ id: 'dup', content: 'v1' }) as any);
    await repo.upsert(makeMemory({ id: 'dup', content: 'v2', timestamp: 1750000001000 }) as any);

    const rows = await repo.list();
    expect(rows).toHaveLength(1);
    expect(rows[0].content).toBe('v2');
    expect(rows[0].timestamp).toBe(1750000001000);
  });

  it('stores optional fields as NULL and maps them back as undefined', async () => {
    await repo.upsert({
      id: 'bare',
      content: 'no scope',
      embedding: [1],
      timestamp: 1,
    });

    const restored = await repo.getById('bare');
    expect(restored).toEqual({
      id: 'bare',
      content: 'no scope',
      embedding: [1],
      timestamp: 1,
    });
  });

  it('migration down() removes the table; up() is idempotent', async () => {
    // Idempotent re-run while the table exists.
    await expect(up({ db, isPostgres: false })).resolves.toBeUndefined();

    await down({ db, isPostgres: false });
    await expect(db.all('SELECT * FROM memvault_memories')).rejects.toThrow(/no such table/i);

    // Recreate for the afterEach-safe state.
    await up({ db, isPostgres: false });
  });

  it('repository degrades gracefully when the database is unavailable', async () => {
    const offline = new MemVaultRepository(
      () => null,
      () => false
    );

    await expect(offline.upsert(makeMemory() as any)).resolves.toBeUndefined();
    await expect(offline.getById('mem-1')).resolves.toBeNull();
    await expect(offline.list()).resolves.toEqual([]);
    await expect(offline.deleteById('mem-1')).resolves.toBe(false);
    await expect(offline.clear()).resolves.toBe(0);
  });
});
