import {
  auditLogger,
  type AuditEventStore,
  type AuditLogEntry,
  type AuditLogQuery,
  type AuditLogStats,
} from '../../../../src/server/middleware/auditLogger';

/** In-memory fake of the durable AuditEventStore for deterministic tests. */
function makeFakeStore() {
  const inserted: AuditLogEntry[] = [];
  let seed: AuditLogEntry[] = [];

  const store: AuditEventStore = {
    async insert(entry: AuditLogEntry): Promise<boolean> {
      inserted.push(entry);
      return true;
    },
    async query(filters: AuditLogQuery): Promise<AuditLogEntry[]> {
      let results = [...seed];
      if (filters.actions && filters.actions.length > 0) {
        results = results.filter((e) => filters.actions!.includes(e.action));
      }
      if (filters.status) {
        results = results.filter((e) => e.status === filters.status);
      }
      return results;
    },
    async getStats(): Promise<AuditLogStats> {
      const total = seed.length;
      const failure = seed.filter((e) => e.status === 'failure').length;
      return {
        total,
        byAction: {},
        byResource: {},
        byStatus: { success: total - failure, failure },
        failureRate: total > 0 ? (failure / total) * 100 : 0,
      };
    },
    async getRecent(limit: number): Promise<AuditLogEntry[]> {
      // newest-first, as the real repository returns
      return [...seed].reverse().slice(0, limit);
    },
  };

  return {
    store,
    inserted,
    setSeed: (events: AuditLogEntry[]) => {
      seed = events;
    },
  };
}

function entry(overrides: Partial<AuditLogEntry> = {}): Omit<AuditLogEntry, 'timestamp'> {
  return {
    action: 'CREATE',
    resource: 'bot',
    ip: '127.0.0.1',
    userAgent: 'jest',
    status: 'success',
    ...overrides,
  };
}

describe('AuditLoggerService durable persistence', () => {
  afterEach(() => {
    // Reset to a clean fake store so tests are isolated.
    auditLogger.setStore(makeFakeStore().store);
  });

  it('persists each logged event to the durable store', async () => {
    const fake = makeFakeStore();
    auditLogger.setStore(fake.store);

    auditLogger.log(entry({ action: 'CREATE' }));
    auditLogger.log(entry({ action: 'DELETE', status: 'failure' }));

    // insert is fire-and-forget; flush the microtask queue.
    await Promise.resolve();
    await Promise.resolve();

    expect(fake.inserted).toHaveLength(2);
    expect(fake.inserted[0].action).toBe('CREATE');
    expect(fake.inserted[1].action).toBe('DELETE');
    // timestamp is stamped by the logger, not the caller.
    expect(fake.inserted[0].timestamp).toEqual(expect.any(String));
  });

  it('keeps the synchronous in-memory query working alongside persistence', async () => {
    const fake = makeFakeStore();
    auditLogger.setStore(fake.store);

    auditLogger.log(entry({ action: 'UPDATE', resource: 'user' }));
    const recent = auditLogger.query({ actions: ['UPDATE'] });
    expect(recent).toHaveLength(1);
    expect(recent[0].resource).toBe('user');
  });

  it('hydrates the in-memory cache from the durable store after a restart', async () => {
    const fake = makeFakeStore();
    fake.setSeed([
      {
        timestamp: '2024-01-01T00:00:00.000Z',
        action: 'CREATE',
        resource: 'bot',
        ip: '10.0.0.1',
        userAgent: 'prior-process',
        status: 'success',
      },
    ]);
    auditLogger.setStore(fake.store);

    // Simulate a fresh process: in-memory cache empty, then hydrate from DB.
    expect(auditLogger.getLogs()).toHaveLength(0);
    await auditLogger.hydrate();

    const logs = auditLogger.getLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0].userAgent).toBe('prior-process');
  });

  it('queryPersisted reads from the durable store', async () => {
    const fake = makeFakeStore();
    fake.setSeed([
      {
        timestamp: '2024-02-01T00:00:00.000Z',
        action: 'DELETE',
        resource: 'user',
        ip: '10.0.0.2',
        userAgent: 'db',
        status: 'failure',
      },
    ]);
    auditLogger.setStore(fake.store);

    const results = await auditLogger.queryPersisted({ status: 'failure' });
    expect(results).toHaveLength(1);
    expect(results[0].action).toBe('DELETE');
  });

  it('getStatsPersisted aggregates from the durable store', async () => {
    const fake = makeFakeStore();
    fake.setSeed([
      {
        timestamp: '2024-03-01T00:00:00.000Z',
        action: 'CREATE',
        resource: 'bot',
        ip: '',
        userAgent: '',
        status: 'success',
      },
      {
        timestamp: '2024-03-02T00:00:00.000Z',
        action: 'DELETE',
        resource: 'bot',
        ip: '',
        userAgent: '',
        status: 'failure',
      },
    ]);
    auditLogger.setStore(fake.store);

    const stats = await auditLogger.getStatsPersisted();
    expect(stats.total).toBe(2);
    expect(stats.byStatus).toEqual({ success: 1, failure: 1 });
    expect(stats.failureRate).toBeCloseTo(50);
  });
});
