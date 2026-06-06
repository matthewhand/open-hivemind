import { AnomalyRepository } from '../../../src/database/repositories/AnomalyRepository';
import { MessageRepository } from '../../../src/database/repositories/MessageRepository';
import type { IDatabase } from '../../../src/database/types';

/**
 * Both repositories upsert with SQLite's `INSERT OR REPLACE`, which is a syntax
 * error on Postgres. These tests assert each repo emits an `ON CONFLICT ... DO
 * UPDATE` upsert when running against Postgres, and the original SQLite syntax
 * otherwise — so the Postgres path no longer silently loses data.
 */
function mockDb() {
  const run = jest.fn().mockResolvedValue({ changes: 1, lastID: 1 });
  const db = {
    run,
    get: jest.fn(),
    all: jest.fn().mockResolvedValue([]),
    exec: jest.fn(),
    transaction: jest.fn(),
    close: jest.fn(),
  } as unknown as IDatabase;
  return { db, run };
}

const anomaly = {
  id: 'a1',
  timestamp: 1,
  metric: 'cpu',
  value: 9,
  expectedMean: 1,
  standardDeviation: 1,
  zScore: 8,
  threshold: 3,
  severity: 'high',
  explanation: 'spike',
  resolved: false,
  tenantId: 't1',
} as never;

describe('AnomalyRepository.storeAnomaly dialect upsert', () => {
  it('emits ON CONFLICT (id) DO UPDATE on Postgres', async () => {
    const { db, run } = mockDb();
    const repo = new AnomalyRepository(
      () => db,
      () => true,
      () => true
    );
    await repo.storeAnomaly(anomaly);
    const sql = run.mock.calls[0][0] as string;
    expect(sql).toContain('INSERT INTO anomalies');
    expect(sql).toContain('ON CONFLICT (id) DO UPDATE SET');
    expect(sql).not.toContain('INSERT OR REPLACE');
  });

  it('keeps INSERT OR REPLACE on SQLite', async () => {
    const { db, run } = mockDb();
    const repo = new AnomalyRepository(
      () => db,
      () => true,
      () => false
    );
    await repo.storeAnomaly(anomaly);
    const sql = run.mock.calls[0][0] as string;
    expect(sql).toContain('INSERT OR REPLACE INTO anomalies');
    expect(sql).not.toContain('ON CONFLICT');
  });
});

const metrics = {
  botName: 'bot-1',
  messagesSent: 5,
  messagesReceived: 7,
  conversationsHandled: 2,
  averageResponseTime: 12,
  lastActivity: new Date(0),
  provider: 'discord',
} as never;

describe('MessageRepository.updateBotMetrics dialect upsert', () => {
  it('emits ON CONFLICT (botName) DO UPDATE on Postgres', async () => {
    const { db, run } = mockDb();
    const repo = new MessageRepository(
      () => db,
      () => true,
      () => {},
      () => true
    );
    await repo.updateBotMetrics(metrics);
    const sql = run.mock.calls[0][0] as string;
    expect(sql).toContain('INSERT INTO bot_metrics');
    expect(sql).toContain('ON CONFLICT (botName) DO UPDATE SET');
    expect(sql).not.toContain('INSERT OR REPLACE');
  });

  it('keeps INSERT OR REPLACE on SQLite', async () => {
    const { db, run } = mockDb();
    const repo = new MessageRepository(
      () => db,
      () => true,
      () => {},
      () => false
    );
    await repo.updateBotMetrics(metrics);
    const sql = run.mock.calls[0][0] as string;
    expect(sql).toContain('INSERT OR REPLACE INTO bot_metrics');
    expect(sql).not.toContain('ON CONFLICT');
  });
});
