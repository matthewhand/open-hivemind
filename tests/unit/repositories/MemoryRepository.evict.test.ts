import { MemoryRepository } from '../../../src/database/repositories/MemoryRepository';
import type { IDatabase } from '../../../src/database/types';

/**
 * Lightweight in-memory fake of the SQLite-flavoured IDatabase, supporting only
 * the SQL shapes that MemoryRepository.evictMemories issues. This lets us assert
 * real eviction behaviour (TTL + max-count + scoping) without a live database.
 */
interface FakeRow {
  id: number;
  userId: string | null;
  agentId: string | null;
  created_at: number; // epoch ms
}

function daysAgo(days: number): number {
  return Date.now() - days * 24 * 60 * 60 * 1000;
}

function matchesScope(row: FakeRow, params: any[], hasUser: boolean, hasAgent: boolean): boolean {
  let i = 0;
  if (hasUser) {
    if (row.userId !== params[i]) return false;
    i++;
  }
  if (hasAgent) {
    if (row.agentId !== params[i]) return false;
  }
  return true;
}

function makeFakeDb(rows: FakeRow[]): IDatabase {
  return {
    async run(sql: string, params: any[] = []) {
      if (sql.startsWith('DELETE FROM memories WHERE created_at <')) {
        // TTL delete. Parse the cutoff from the sql expression.
        const match = sql.match(/-(\d+) days/);
        const days = match ? parseInt(match[1], 10) : 0;
        const cutoff = daysAgo(days);
        const hasUser = sql.includes('userId = ?');
        const hasAgent = sql.includes('agentId = ?');
        const before = rows.length;
        for (let i = rows.length - 1; i >= 0; i--) {
          if (rows[i].created_at < cutoff && matchesScope(rows[i], params, hasUser, hasAgent)) {
            rows.splice(i, 1);
          }
        }
        return { lastID: 0, changes: before - rows.length };
      }
      if (sql.startsWith('DELETE FROM memories WHERE id <=')) {
        const cutoffId = params[0];
        const scopeParams = params.slice(1);
        const hasUser = sql.includes('userId = ?');
        const hasAgent = sql.includes('agentId = ?');
        const before = rows.length;
        for (let i = rows.length - 1; i >= 0; i--) {
          if (rows[i].id <= cutoffId && matchesScope(rows[i], scopeParams, hasUser, hasAgent)) {
            rows.splice(i, 1);
          }
        }
        return { lastID: 0, changes: before - rows.length };
      }
      throw new Error(`Unexpected SQL in run(): ${sql}`);
    },
    async get(sql: string, params: any[] = []) {
      // SELECT id ... ORDER BY id DESC LIMIT 1 OFFSET ?
      if (sql.includes('ORDER BY id DESC LIMIT 1 OFFSET ?')) {
        const offset = params[params.length - 1];
        const scopeParams = params.slice(0, params.length - 1);
        const hasUser = sql.includes('userId = ?');
        const hasAgent = sql.includes('agentId = ?');
        const inScope = rows
          .filter((r) => matchesScope(r, scopeParams, hasUser, hasAgent))
          .sort((a, b) => b.id - a.id);
        const row = inScope[offset];
        return row ? { id: row.id } : undefined;
      }
      throw new Error(`Unexpected SQL in get(): ${sql}`);
    },
    async all() {
      return [];
    },
    async exec() {},
    async transaction(cb: any) {
      return cb(this);
    },
    async close() {},
  } as unknown as IDatabase;
}

function makeRepo(rows: FakeRow[], opts: { connected?: boolean; postgres?: boolean } = {}) {
  const db = makeFakeDb(rows);
  return new MemoryRepository(
    () => db,
    () => opts.connected ?? true,
    () => opts.postgres ?? false
  );
}

describe('MemoryRepository.evictMemories', () => {
  it('is a no-op when no policy is provided (safe by default)', async () => {
    const rows: FakeRow[] = [
      { id: 1, userId: null, agentId: null, created_at: daysAgo(100) },
    ];
    const repo = makeRepo(rows);
    const deleted = await repo.evictMemories();
    expect(deleted).toBe(0);
    expect(rows).toHaveLength(1);
  });

  it('is a no-op for zero/negative policy values', async () => {
    const rows: FakeRow[] = [
      { id: 1, userId: null, agentId: null, created_at: daysAgo(100) },
    ];
    const repo = makeRepo(rows);
    expect(await repo.evictMemories({ olderThanDays: 0, maxCount: 0 })).toBe(0);
    expect(await repo.evictMemories({ olderThanDays: -5, maxCount: -1 })).toBe(0);
    expect(rows).toHaveLength(1);
  });

  it('deletes memories older than the TTL cutoff', async () => {
    const rows: FakeRow[] = [
      { id: 1, userId: null, agentId: null, created_at: daysAgo(40) }, // old
      { id: 2, userId: null, agentId: null, created_at: daysAgo(10) }, // recent
      { id: 3, userId: null, agentId: null, created_at: daysAgo(31) }, // old
    ];
    const repo = makeRepo(rows);
    const deleted = await repo.evictMemories({ olderThanDays: 30 });
    expect(deleted).toBe(2);
    expect(rows.map((r) => r.id)).toEqual([2]);
  });

  it('keeps only the newest maxCount memories', async () => {
    const rows: FakeRow[] = [
      { id: 1, userId: null, agentId: null, created_at: daysAgo(5) },
      { id: 2, userId: null, agentId: null, created_at: daysAgo(4) },
      { id: 3, userId: null, agentId: null, created_at: daysAgo(3) },
      { id: 4, userId: null, agentId: null, created_at: daysAgo(2) },
      { id: 5, userId: null, agentId: null, created_at: daysAgo(1) },
    ];
    const repo = makeRepo(rows);
    const deleted = await repo.evictMemories({ maxCount: 2 });
    expect(deleted).toBe(3);
    expect(rows.map((r) => r.id).sort((a, b) => a - b)).toEqual([4, 5]);
  });

  it('does not delete when count is at or below maxCount', async () => {
    const rows: FakeRow[] = [
      { id: 1, userId: null, agentId: null, created_at: daysAgo(2) },
      { id: 2, userId: null, agentId: null, created_at: daysAgo(1) },
    ];
    const repo = makeRepo(rows);
    const deleted = await repo.evictMemories({ maxCount: 5 });
    expect(deleted).toBe(0);
    expect(rows).toHaveLength(2);
  });

  it('applies TTL and max-count together', async () => {
    const rows: FakeRow[] = [
      { id: 1, userId: null, agentId: null, created_at: daysAgo(60) }, // removed by TTL
      { id: 2, userId: null, agentId: null, created_at: daysAgo(5) },
      { id: 3, userId: null, agentId: null, created_at: daysAgo(4) },
      { id: 4, userId: null, agentId: null, created_at: daysAgo(3) },
    ];
    const repo = makeRepo(rows);
    // TTL removes id 1; then max-count keeps newest 2 (ids 3,4), removing id 2.
    const deleted = await repo.evictMemories({ olderThanDays: 30, maxCount: 2 });
    expect(deleted).toBe(2);
    expect(rows.map((r) => r.id).sort((a, b) => a - b)).toEqual([3, 4]);
  });

  it('scopes eviction by agentId', async () => {
    const rows: FakeRow[] = [
      { id: 1, userId: null, agentId: 'botA', created_at: daysAgo(40) },
      { id: 2, userId: null, agentId: 'botB', created_at: daysAgo(40) },
    ];
    const repo = makeRepo(rows);
    const deleted = await repo.evictMemories({ olderThanDays: 30, agentId: 'botA' });
    expect(deleted).toBe(1);
    expect(rows.map((r) => r.id)).toEqual([2]);
  });

  it('scopes max-count eviction by userId', async () => {
    const rows: FakeRow[] = [
      { id: 1, userId: 'u1', agentId: null, created_at: daysAgo(5) },
      { id: 2, userId: 'u1', agentId: null, created_at: daysAgo(4) },
      { id: 3, userId: 'u1', agentId: null, created_at: daysAgo(3) },
      { id: 4, userId: 'u2', agentId: null, created_at: daysAgo(2) }, // other user untouched
    ];
    const repo = makeRepo(rows);
    const deleted = await repo.evictMemories({ maxCount: 1, userId: 'u1' });
    expect(deleted).toBe(2);
    expect(rows.map((r) => r.id).sort((a, b) => a - b)).toEqual([3, 4]);
  });

  it('returns 0 when not connected', async () => {
    const rows: FakeRow[] = [
      { id: 1, userId: null, agentId: null, created_at: daysAgo(100) },
    ];
    const repo = makeRepo(rows, { connected: false });
    expect(await repo.evictMemories({ olderThanDays: 1 })).toBe(0);
    expect(rows).toHaveLength(1);
  });

  it('builds a Postgres-flavoured TTL query when isPostgres is true', async () => {
    const run = jest.fn().mockResolvedValue({ lastID: 0, changes: 0 });
    const get = jest.fn().mockResolvedValue(undefined);
    const db = { run, get, all: jest.fn(), exec: jest.fn(), transaction: jest.fn(), close: jest.fn() } as unknown as IDatabase;
    const repo = new MemoryRepository(() => db, () => true, () => true);
    await repo.evictMemories({ olderThanDays: 7 });
    expect(run).toHaveBeenCalledTimes(1);
    const sql = run.mock.calls[0][0] as string;
    expect(sql).toContain("NOW() - INTERVAL '7 days'");
  });
});
