import { MemoryRepository } from '../../../src/database/repositories/MemoryRepository';
import type { IDatabase } from '../../../src/database/types';

/**
 * Focused tests for MemoryRepository.getMemoryById, which performs a direct
 * indexed lookup (SELECT ... WHERE id = ?) rather than scanning many rows.
 */
function makeRepo(
  getImpl: (sql: string, params: any[]) => Promise<any>,
  opts: { connected?: boolean } = {}
) {
  const get = jest.fn(getImpl);
  const db = {
    run: jest.fn(),
    get,
    all: jest.fn(),
    exec: jest.fn(),
    transaction: jest.fn(),
    close: jest.fn(),
  } as unknown as IDatabase;
  const repo = new MemoryRepository(
    () => db,
    () => opts.connected ?? true,
    () => false
  );
  return { repo, get };
}

describe('MemoryRepository.getMemoryById', () => {
  it('issues a single indexed WHERE id = ? query and parses metadata', async () => {
    const { repo, get } = makeRepo(async () => ({
      id: 7,
      content: 'hello',
      metadata: JSON.stringify({ foo: 'bar' }),
      userId: 'u1',
      agentId: 'a1',
    }));

    const row = await repo.getMemoryById('7');

    expect(get).toHaveBeenCalledTimes(1);
    expect(get).toHaveBeenCalledWith('SELECT * FROM memories WHERE id = ?', ['7']);
    expect(row).toEqual(
      expect.objectContaining({
        id: 7,
        content: 'hello',
        metadata: { foo: 'bar' },
        userId: 'u1',
        agentId: 'a1',
      })
    );
  });

  it('returns null when no row matches the id', async () => {
    const { repo } = makeRepo(async () => undefined);
    expect(await repo.getMemoryById('does-not-exist')).toBeNull();
  });

  it('returns undefined metadata when the column is empty', async () => {
    const { repo } = makeRepo(async () => ({ id: 1, content: 'x', metadata: null }));
    const row = await repo.getMemoryById(1);
    expect(row?.metadata).toBeUndefined();
  });

  it('returns null and does not throw when not connected', async () => {
    const { repo, get } = makeRepo(async () => ({ id: 1 }), { connected: false });
    expect(await repo.getMemoryById(1)).toBeNull();
    expect(get).not.toHaveBeenCalled();
  });

  it('returns null when the underlying query throws', async () => {
    const { repo } = makeRepo(async () => {
      throw new Error('db boom');
    });
    expect(await repo.getMemoryById(1)).toBeNull();
  });
});
