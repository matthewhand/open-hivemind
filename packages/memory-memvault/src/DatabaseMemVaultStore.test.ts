import {
  DatabaseMemVaultStore,
  isMemVaultDurableBackend,
  type MemVaultDurableBackend,
  type MemVaultScopeFilter,
} from './DatabaseMemVaultStore';
import { create } from './MemVaultProvider';
import type { StoredMemory } from './types';

type DurableRecord = StoredMemory & { timestamp: number };

/** In-memory fake of the durable backend (stands in for DatabaseManager). */
function makeFakeBackend(seed: DurableRecord[] = []) {
  const rows = new Map<string, DurableRecord>(seed.map((r) => [r.id, { ...r }]));
  const backend: MemVaultDurableBackend & { rows: Map<string, DurableRecord> } = {
    rows,
    isConnected: () => true,
    upsertMemVaultMemory: jest.fn(async (record: DurableRecord) => {
      rows.set(record.id, { ...record });
    }),
    getMemVaultMemory: jest.fn(async (id: string) => rows.get(id) ?? null),
    listMemVaultMemories: jest.fn(async (scope?: MemVaultScopeFilter) =>
      [...rows.values()].filter(
        (r) =>
          (scope?.userId == null || r.userId === scope.userId) &&
          (scope?.agentId == null || r.agentId === scope.agentId)
      )
    ),
    deleteMemVaultMemory: jest.fn(async (id: string) => rows.delete(id)),
    clearMemVaultMemories: jest.fn(async (scope?: MemVaultScopeFilter) => {
      let removed = 0;
      for (const [id, r] of rows) {
        if (
          (scope?.userId == null || r.userId === scope.userId) &&
          (scope?.agentId == null || r.agentId === scope.agentId)
        ) {
          rows.delete(id);
          removed++;
        }
      }
      return removed;
    }),
  };
  return backend;
}

const record = (overrides: Partial<DurableRecord> = {}): DurableRecord => ({
  id: 'm1',
  content: 'hello',
  embedding: [1, 0],
  timestamp: 1000,
  ...overrides,
});

describe('DatabaseMemVaultStore', () => {
  it('writes through to the backend and serves reads from the cache', async () => {
    const backend = makeFakeBackend();
    const store = new DatabaseMemVaultStore(backend);

    await store.put(record());
    expect(backend.upsertMemVaultMemory).toHaveBeenCalledTimes(1);

    const found = await store.get('m1');
    expect(found?.content).toBe('hello');
    // Cache hit — no backend read needed.
    expect(backend.getMemVaultMemory).not.toHaveBeenCalled();
  });

  it('hydrates the cache from the backend exactly once on first list()', async () => {
    const backend = makeFakeBackend([record({ id: 'persisted', content: 'from db' })]);
    const store = new DatabaseMemVaultStore(backend);

    const first = await store.list();
    expect(first.map((m) => m.id)).toEqual(['persisted']);

    await store.list();
    expect(backend.listMemVaultMemories).toHaveBeenCalledTimes(1);
  });

  it('keeps cached (newer) records over hydrated rows with the same id', async () => {
    const backend = makeFakeBackend([record({ id: 'm1', content: 'stale row' })]);
    const store = new DatabaseMemVaultStore(backend);

    await store.put(record({ id: 'm1', content: 'fresh write' }));
    const all = await store.list();
    expect(all).toHaveLength(1);
    expect(all[0].content).toBe('fresh write');
  });

  it('tolerates backend failures: put/get/list keep working from the cache', async () => {
    const onError = jest.fn();
    const backend = makeFakeBackend();
    (backend.upsertMemVaultMemory as jest.Mock).mockRejectedValue(new Error('db down'));
    (backend.listMemVaultMemories as jest.Mock).mockRejectedValue(new Error('db down'));
    const store = new DatabaseMemVaultStore(backend, onError);

    await expect(store.put(record())).resolves.toBeUndefined();
    await expect(store.get('m1')).resolves.toMatchObject({ id: 'm1' });
    await expect(store.list()).resolves.toHaveLength(1);
    expect(onError).toHaveBeenCalledWith('put', expect.any(Error));
    expect(onError).toHaveBeenCalledWith('hydrate', expect.any(Error));
  });

  it('defaults the timestamp at write time when the record has none', async () => {
    const backend = makeFakeBackend();
    const store = new DatabaseMemVaultStore(backend);
    const before = Date.now();

    const { timestamp: _ignored, ...withoutTimestamp } = record();
    await store.put(withoutTimestamp as StoredMemory);

    const written = (backend.upsertMemVaultMemory as jest.Mock).mock.calls[0][0];
    expect(written.timestamp).toBeGreaterThanOrEqual(before);
  });
});

describe('isMemVaultDurableBackend', () => {
  it('accepts an object with the full backend surface', () => {
    expect(isMemVaultDurableBackend(makeFakeBackend())).toBe(true);
  });

  it('rejects null and partial objects', () => {
    expect(isMemVaultDurableBackend(null)).toBe(false);
    expect(isMemVaultDurableBackend({})).toBe(false);
    expect(isMemVaultDurableBackend({ isConnected: () => true })).toBe(false);
  });
});

describe('create() durable-store selection', () => {
  const dependencies = (databaseManager: unknown) =>
    ({
      getDatabaseManager: () => databaseManager,
      getLlmProviders: () => [],
    }) as any;

  it('uses the database-backed store when the injected manager qualifies', async () => {
    const backend = makeFakeBackend([record({ id: 'persisted' })]);
    const provider = create({}, dependencies(backend));

    // getMemory goes through the store; a hit proves the durable store is wired.
    const entry = await provider.getMemory('persisted');
    expect(entry?.id).toBe('persisted');
    expect(backend.getMemVaultMemory).toHaveBeenCalledWith('persisted');
  });

  it('falls back to the in-memory store when no database manager is available', async () => {
    const provider = create({}, dependencies(undefined));
    await expect(provider.getMemory('anything')).resolves.toBeNull();
  });

  it('honors durable=false even when a backend is available', async () => {
    const backend = makeFakeBackend([record({ id: 'persisted' })]);
    const provider = create({ durable: false }, dependencies(backend));

    await expect(provider.getMemory('persisted')).resolves.toBeNull();
    expect(backend.getMemVaultMemory).not.toHaveBeenCalled();
  });
});
