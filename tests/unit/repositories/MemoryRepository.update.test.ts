import { MemoryRepository } from '../../../src/database/repositories/MemoryRepository';
import type { IDatabase } from '../../../src/database/types';

/**
 * Focused tests for MemoryRepository.updateMemory, which updates an existing
 * memory row in place (preserving id / created_at). Only the supplied fields
 * are written, and embeddings are encoded per-dialect (pgvector vs JSON).
 */
function makeRepo(
  runImpl: (sql: string, params: any[]) => Promise<any>,
  opts: { connected?: boolean; postgres?: boolean } = {}
) {
  const run = jest.fn(runImpl);
  const db = {
    run,
    get: jest.fn(),
    all: jest.fn(),
    exec: jest.fn(),
    transaction: jest.fn(),
    close: jest.fn(),
  } as unknown as IDatabase;
  const repo = new MemoryRepository(
    () => db,
    () => opts.connected ?? true,
    () => opts.postgres ?? false
  );
  return { repo, run };
}

describe('MemoryRepository.updateMemory', () => {
  it('writes only the supplied fields and returns true when a row changed', async () => {
    const { repo, run } = makeRepo(async () => ({ changes: 1 }));

    const ok = await repo.updateMemory('7', {
      content: 'updated',
      metadata: { foo: 'bar' },
      embedding: [0.1, 0.2],
    });

    expect(ok).toBe(true);
    expect(run).toHaveBeenCalledTimes(1);
    const [sql, params] = run.mock.calls[0];
    expect(sql).toBe('UPDATE memories SET content = ?, metadata = ?, embedding = ? WHERE id = ?');
    // SQLite encodes the embedding as a JSON string; id is the final param.
    expect(params).toEqual(['updated', JSON.stringify({ foo: 'bar' }), '[0.1,0.2]', '7']);
  });

  it('encodes the embedding as a pgvector literal on Postgres', async () => {
    const { repo, run } = makeRepo(async () => ({ changes: 1 }), { postgres: true });

    await repo.updateMemory(3, { embedding: [1, 2, 3] });

    const [sql, params] = run.mock.calls[0];
    expect(sql).toBe('UPDATE memories SET embedding = ?::vector WHERE id = ?');
    expect(params).toEqual(['[1,2,3]', 3]);
  });

  it('updates content alone without clobbering metadata or embedding', async () => {
    const { repo, run } = makeRepo(async () => ({ changes: 1 }));

    await repo.updateMemory('9', { content: 'just text' });

    const [sql, params] = run.mock.calls[0];
    expect(sql).toBe('UPDATE memories SET content = ? WHERE id = ?');
    expect(params).toEqual(['just text', '9']);
  });

  it('returns false (no query) when no updatable field is supplied', async () => {
    const { repo, run } = makeRepo(async () => ({ changes: 1 }));
    expect(await repo.updateMemory('1', {})).toBe(false);
    expect(run).not.toHaveBeenCalled();
  });

  it('returns false when no row matched the id', async () => {
    const { repo } = makeRepo(async () => ({ changes: 0 }));
    expect(await repo.updateMemory('missing', { content: 'x' })).toBe(false);
  });

  it('returns false and does not query when not connected', async () => {
    const { repo, run } = makeRepo(async () => ({ changes: 1 }), { connected: false });
    expect(await repo.updateMemory('1', { content: 'x' })).toBe(false);
    expect(run).not.toHaveBeenCalled();
  });

  it('propagates the error when the underlying query throws', async () => {
    const { repo } = makeRepo(async () => {
      throw new Error('db boom');
    });
    await expect(repo.updateMemory('1', { content: 'x' })).rejects.toThrow('db boom');
  });
});
