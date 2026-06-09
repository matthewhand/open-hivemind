import {
  BotTaskRepository,
  type BotScheduledTaskRecord,
} from '../../src/database/repositories/BotTaskRepository';
import type { IDatabase } from '../../src/database/types';

const makeTask = (overrides: Partial<BotScheduledTaskRecord> = {}): BotScheduledTaskRecord => ({
  id: 'task_1',
  botId: 'bot-1',
  botName: 'TestBot',
  prompt: 'Daily standup summary',
  intervalMs: 3600000,
  lastRun: undefined,
  nextRun: 1700000000000,
  enabled: true,
  ...overrides,
});

describe('BotTaskRepository', () => {
  let run: jest.Mock;
  let all: jest.Mock;
  let db: IDatabase;

  beforeEach(() => {
    run = jest.fn().mockResolvedValue({ changes: 1 });
    all = jest.fn().mockResolvedValue([]);
    db = { run, all, get: jest.fn(), exec: jest.fn(), close: jest.fn() } as unknown as IDatabase;
  });

  const connectedRepo = (isPostgres = false) =>
    new BotTaskRepository(
      () => db,
      () => true,
      () => isPostgres
    );

  it('returns [] and skips writes when the database is not connected', async () => {
    const repo = new BotTaskRepository(
      () => null,
      () => false
    );

    await expect(repo.getAllTasks()).resolves.toEqual([]);
    await expect(repo.upsertTask(makeTask())).resolves.toBeUndefined();
    await expect(repo.deleteTask('task_1')).resolves.toBe(false);
    expect(run).not.toHaveBeenCalled();
  });

  it('maps rows back to task records (enabled flag, numeric columns)', async () => {
    all.mockResolvedValue([
      {
        id: 'task_1',
        botId: 'bot-1',
        botName: 'TestBot',
        prompt: 'Daily standup summary',
        intervalMs: '3600000', // drivers may return BIGINT columns as strings
        lastRun: null,
        nextRun: '1700000000000',
        enabled: 1,
      },
      {
        id: 'task_2',
        botId: 'bot-2',
        botName: 'OtherBot',
        prompt: 'Weekly digest',
        intervalMs: 60000,
        lastRun: '2026-06-01T00:00:00.000Z',
        nextRun: 1700000100000,
        enabled: 0,
      },
    ]);

    const tasks = await connectedRepo().getAllTasks();

    expect(tasks).toEqual([
      makeTask(),
      makeTask({
        id: 'task_2',
        botId: 'bot-2',
        botName: 'OtherBot',
        prompt: 'Weekly digest',
        intervalMs: 60000,
        lastRun: '2026-06-01T00:00:00.000Z',
        nextRun: 1700000100000,
        enabled: false,
      }),
    ]);
  });

  it('upserts with INSERT OR REPLACE on SQLite', async () => {
    await connectedRepo(false).upsertTask(makeTask());

    expect(run).toHaveBeenCalledTimes(1);
    const [sql, params] = run.mock.calls[0];
    expect(sql).toContain('INSERT OR REPLACE INTO bot_scheduled_tasks');
    expect(params).toEqual([
      'task_1',
      'bot-1',
      'TestBot',
      'Daily standup summary',
      3600000,
      null,
      1700000000000,
      1,
    ]);
  });

  it('upserts with ON CONFLICT DO UPDATE on Postgres', async () => {
    await connectedRepo(true).upsertTask(makeTask({ enabled: false, lastRun: '2026-06-10' }));

    const [sql, params] = run.mock.calls[0];
    expect(sql).toContain('ON CONFLICT (id) DO UPDATE SET');
    expect(sql).not.toContain('INSERT OR REPLACE');
    expect(params[5]).toBe('2026-06-10');
    expect(params[7]).toBe(0);
  });

  it('deletes by id and reports whether a row was removed', async () => {
    const repo = connectedRepo();

    await expect(repo.deleteTask('task_1')).resolves.toBe(true);
    expect(run).toHaveBeenCalledWith('DELETE FROM bot_scheduled_tasks WHERE id = ?', ['task_1']);

    run.mockResolvedValue({ changes: 0 });
    await expect(repo.deleteTask('missing')).resolves.toBe(false);
  });
});
