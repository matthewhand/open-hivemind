import {
  AuditEventRepository,
  type AuditEventRecord,
} from '../../../src/database/repositories/AuditEventRepository';
import type { IDatabase } from '../../../src/database/types';

/**
 * Lightweight in-memory fake of the SQLite-flavoured IDatabase that interprets
 * the specific SQL shapes AuditEventRepository issues. This exercises real
 * filter / pagination / stats behaviour without a live database.
 */
interface StoredRow {
  id: number;
  timestamp: string;
  action: string;
  resource: string;
  resource_id: string | null;
  user_id: string | null;
  ip: string | null;
  user_agent: string | null;
  before_value: string | null;
  after_value: string | null;
  status: string;
  error_message: string | null;
}

function makeFakeDb(): { db: IDatabase; rows: StoredRow[] } {
  const rows: StoredRow[] = [];
  let nextId = 1;

  // Re-implements the WHERE semantics the repository builds, consuming params
  // positionally in the same order buildWhere pushes them.
  function applyWhere(sql: string, params: any[]): { matched: StoredRow[]; rest: any[] } {
    let i = 0;
    let matched = [...rows];
    if (sql.includes('timestamp >= ?')) {
      const v = params[i++];
      matched = matched.filter((r) => r.timestamp >= v);
    }
    if (sql.includes('timestamp <= ?')) {
      const v = params[i++];
      matched = matched.filter((r) => r.timestamp <= v);
    }
    const actionIn = sql.match(/action IN \(([^)]*)\)/);
    if (actionIn) {
      const n = actionIn[1].split(',').length;
      const vals = params.slice(i, i + n);
      i += n;
      matched = matched.filter((r) => vals.includes(r.action));
    }
    const resourceIn = sql.match(/resource IN \(([^)]*)\)/);
    if (resourceIn) {
      const n = resourceIn[1].split(',').length;
      const vals = params.slice(i, i + n);
      i += n;
      matched = matched.filter((r) => vals.includes(r.resource));
    }
    if (sql.includes('status = ?')) {
      const v = params[i++];
      matched = matched.filter((r) => r.status === v);
    }
    if (sql.includes('LOWER(action) LIKE ?')) {
      const term = String(params[i]).replace(/%/g, '').toLowerCase();
      i += 5; // search uses 5 bound params
      matched = matched.filter(
        (r) =>
          r.action.toLowerCase().includes(term) ||
          r.resource.toLowerCase().includes(term) ||
          (r.resource_id ?? '').toLowerCase().includes(term) ||
          (r.user_id ?? '').toLowerCase().includes(term) ||
          (r.error_message ?? '').toLowerCase().includes(term)
      );
    }
    return { matched, rest: params.slice(i) };
  }

  const db = {
    async run(sql: string, params: any[] = []) {
      if (sql.includes('INSERT INTO audit_events')) {
        const [
          timestamp,
          action,
          resource,
          resource_id,
          user_id,
          ip,
          user_agent,
          before_value,
          after_value,
          status,
          error_message,
        ] = params;
        rows.push({
          id: nextId++,
          timestamp,
          action,
          resource,
          resource_id,
          user_id,
          ip,
          user_agent,
          before_value,
          after_value,
          status,
          error_message,
        });
        return { lastID: nextId - 1, changes: 1 };
      }
      throw new Error(`Unexpected SQL in run(): ${sql}`);
    },
    async all(sql: string, params: any[] = []) {
      if (sql.includes('GROUP BY action, resource, status')) {
        const { matched } = applyWhere(sql, params);
        const groups = new Map<
          string,
          { action: string; resource: string; status: string; count: number }
        >();
        for (const r of matched) {
          const key = `${r.action}|${r.resource}|${r.status}`;
          const g = groups.get(key) || {
            action: r.action,
            resource: r.resource,
            status: r.status,
            count: 0,
          };
          g.count++;
          groups.set(key, g);
        }
        return [...groups.values()];
      }
      if (sql.includes('SELECT * FROM audit_events')) {
        const { matched, rest } = applyWhere(sql, params);
        const [limit, offset] = rest;
        const ordered = [...matched].sort((a, b) => b.id - a.id);
        return ordered.slice(offset, offset + limit);
      }
      throw new Error(`Unexpected SQL in all(): ${sql}`);
    },
    async get() {
      return undefined;
    },
    async exec() {},
    async transaction(cb: any) {
      return cb(db);
    },
    async close() {},
  } as unknown as IDatabase;

  return { db, rows };
}

function makeRepo(connected = true) {
  const { db, rows } = makeFakeDb();
  const repo = new AuditEventRepository(
    () => db,
    () => connected
  );
  return { repo, rows };
}

const base: Omit<AuditEventRecord, 'timestamp'> = {
  action: 'CREATE',
  resource: 'bot',
  ip: '127.0.0.1',
  userAgent: 'jest',
  status: 'success',
};

function event(overrides: Partial<AuditEventRecord> & { timestamp: string }): AuditEventRecord {
  return { ...base, ...overrides };
}

describe('AuditEventRepository', () => {
  it('persists an event and reads it back', async () => {
    const { repo, rows } = makeRepo();
    const ok = await repo.insert(event({ timestamp: '2024-01-01T00:00:00.000Z' }));
    expect(ok).toBe(true);
    expect(rows).toHaveLength(1);

    const all = await repo.query();
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({ action: 'CREATE', resource: 'bot', status: 'success' });
  });

  it('round-trips structured before/after values as JSON', async () => {
    const { repo } = makeRepo();
    await repo.insert(
      event({
        timestamp: '2024-01-01T00:00:00.000Z',
        action: 'UPDATE',
        before: { name: 'old' },
        after: { name: 'new' },
      })
    );
    const [row] = await repo.query();
    expect(row.before).toEqual({ name: 'old' });
    expect(row.after).toEqual({ name: 'new' });
  });

  it('returns false when not connected and does not write', async () => {
    const { repo, rows } = makeRepo(false);
    const ok = await repo.insert(event({ timestamp: '2024-01-01T00:00:00.000Z' }));
    expect(ok).toBe(false);
    expect(rows).toHaveLength(0);
  });

  it('orders results newest-first and paginates', async () => {
    const { repo } = makeRepo();
    for (let i = 1; i <= 5; i++) {
      await repo.insert(event({ timestamp: `2024-01-0${i}T00:00:00.000Z`, resourceId: String(i) }));
    }
    const firstPage = await repo.query({ limit: 2 });
    expect(firstPage.map((e) => e.resourceId)).toEqual(['5', '4']);

    const secondPage = await repo.query({ limit: 2, offset: 2 });
    expect(secondPage.map((e) => e.resourceId)).toEqual(['3', '2']);
  });

  it('filters by time window, action, resource and status', async () => {
    const { repo } = makeRepo();
    await repo.insert(
      event({ timestamp: '2024-01-01T00:00:00.000Z', action: 'CREATE', resource: 'bot' })
    );
    await repo.insert(
      event({
        timestamp: '2024-02-01T00:00:00.000Z',
        action: 'DELETE',
        resource: 'user',
        status: 'failure',
      })
    );
    await repo.insert(
      event({ timestamp: '2024-03-01T00:00:00.000Z', action: 'UPDATE', resource: 'bot' })
    );

    const byTime = await repo.query({
      startTime: '2024-01-15T00:00:00.000Z',
      endTime: '2024-02-15T00:00:00.000Z',
    });
    expect(byTime.map((e) => e.action)).toEqual(['DELETE']);

    const byAction = await repo.query({ actions: ['CREATE', 'UPDATE'] });
    expect(byAction.map((e) => e.action).sort()).toEqual(['CREATE', 'UPDATE']);

    const byResource = await repo.query({ resources: ['user'] });
    expect(byResource).toHaveLength(1);

    const byStatus = await repo.query({ status: 'failure' });
    expect(byStatus.map((e) => e.action)).toEqual(['DELETE']);
  });

  it('supports free-text search across fields', async () => {
    const { repo } = makeRepo();
    await repo.insert(event({ timestamp: '2024-01-01T00:00:00.000Z', userId: 'alice' }));
    await repo.insert(
      event({
        timestamp: '2024-01-02T00:00:00.000Z',
        userId: 'bob',
        errorMessage: 'permission denied',
        status: 'failure',
      })
    );

    const byUser = await repo.query({ search: 'ALICE' });
    expect(byUser).toHaveLength(1);
    expect(byUser[0].userId).toBe('alice');

    const byError = await repo.query({ search: 'denied' });
    expect(byError).toHaveLength(1);
    expect(byError[0].userId).toBe('bob');
  });

  it('computes aggregate stats over a window', async () => {
    const { repo } = makeRepo();
    await repo.insert(
      event({ timestamp: '2024-01-01T00:00:00.000Z', action: 'CREATE', resource: 'bot' })
    );
    await repo.insert(
      event({ timestamp: '2024-01-02T00:00:00.000Z', action: 'CREATE', resource: 'bot' })
    );
    await repo.insert(
      event({
        timestamp: '2024-01-03T00:00:00.000Z',
        action: 'DELETE',
        resource: 'user',
        status: 'failure',
      })
    );

    const stats = await repo.getStats();
    expect(stats.total).toBe(3);
    expect(stats.byAction).toEqual({ CREATE: 2, DELETE: 1 });
    expect(stats.byResource).toEqual({ bot: 2, user: 1 });
    expect(stats.byStatus).toEqual({ success: 2, failure: 1 });
    expect(stats.failureRate).toBeCloseTo((1 / 3) * 100);
  });

  it('returns empty stats when not connected', async () => {
    const { repo } = makeRepo(false);
    const stats = await repo.getStats();
    expect(stats).toEqual({
      total: 0,
      byAction: {},
      byResource: {},
      byStatus: { success: 0, failure: 0 },
      failureRate: 0,
    });
  });
});
