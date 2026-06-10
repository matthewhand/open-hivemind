import {
  InferenceRepository,
  type InferenceLogSummary,
} from '../../../src/database/repositories/InferenceRepository';
import type { IDatabase } from '../../../src/database/types';

describe('InferenceRepository.getInferenceLogs', () => {
  const sampleRow = {
    id: 7,
    botName: 'Bot A',
    tokensUsed: 123,
    latencyMs: 456,
    provider: 'openai',
    status: 'success',
    errorMessage: null,
    timestamp: '2026-06-10T01:00:00.000Z',
  };

  function makeRepo(opts: { connected?: boolean; isPostgres?: boolean; rows?: any[] } = {}) {
    const all = jest.fn().mockResolvedValue(opts.rows ?? [sampleRow]);
    const db = { all } as unknown as IDatabase;
    const repo = new InferenceRepository(
      () => db,
      () => opts.connected ?? true,
      () => opts.isPostgres ?? false
    );
    return { repo, all };
  }

  it('returns [] when the database is not connected', async () => {
    const { repo, all } = makeRepo({ connected: false });
    await expect(repo.getInferenceLogs()).resolves.toEqual([]);
    expect(all).not.toHaveBeenCalled();
  });

  it('maps rows to summaries (no prompt/response payloads) with null-safe defaults', async () => {
    const { repo } = makeRepo({
      rows: [
        sampleRow,
        {
          id: 8,
          botName: 'Bot B',
          tokensUsed: null,
          latencyMs: null,
          provider: null,
          status: null,
          errorMessage: 'boom',
          timestamp: '2026-06-10T02:00:00.000Z',
        },
      ],
    });

    const logs = await repo.getInferenceLogs();
    const expected: InferenceLogSummary[] = [
      {
        id: 7,
        botName: 'Bot A',
        tokensUsed: 123,
        latencyMs: 456,
        provider: 'openai',
        status: 'success',
        errorMessage: null,
        timestamp: '2026-06-10T01:00:00.000Z',
      },
      {
        id: 8,
        botName: 'Bot B',
        tokensUsed: null,
        latencyMs: null,
        provider: null,
        status: 'unknown',
        errorMessage: 'boom',
        timestamp: '2026-06-10T02:00:00.000Z',
      },
    ];
    expect(logs).toEqual(expected);
  });

  it('builds SQLite-safe datetime() comparisons for time-range filters', async () => {
    const { repo, all } = makeRepo({ isPostgres: false });
    const startTime = new Date('2026-06-01T00:00:00.000Z');
    const endTime = new Date('2026-06-10T00:00:00.000Z');

    await repo.getInferenceLogs({
      botName: 'Bot A',
      provider: 'openai',
      startTime,
      endTime,
      limit: 10,
      offset: 5,
    });

    const [sql, params] = all.mock.calls[0];
    expect(sql).toContain('botName = ?');
    expect(sql).toContain('provider = ?');
    expect(sql).toContain('datetime(timestamp) >= datetime(?)');
    expect(sql).toContain('datetime(timestamp) <= datetime(?)');
    expect(sql).toContain('ORDER BY timestamp DESC');
    expect(params).toEqual([
      'Bot A',
      'openai',
      startTime.toISOString(),
      endTime.toISOString(),
      10,
      5,
    ]);
  });

  it('uses native timestamp comparisons on Postgres', async () => {
    const { repo, all } = makeRepo({ isPostgres: true });
    await repo.getInferenceLogs({ startTime: new Date('2026-06-01T00:00:00.000Z') });

    const [sql] = all.mock.calls[0];
    expect(sql).toContain('timestamp >= ?');
    expect(sql).not.toContain('datetime(');
  });

  it('applies default limit/offset when not provided', async () => {
    const { repo, all } = makeRepo();
    await repo.getInferenceLogs();

    const [, params] = all.mock.calls[0];
    expect(params).toEqual([100, 0]);
  });
});
