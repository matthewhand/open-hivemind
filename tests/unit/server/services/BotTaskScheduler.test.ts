/**
 * BotTaskScheduler persistence tests.
 *
 * loadTasks() used to be an empty stub, so scheduled prompts were lost on
 * restart. These tests verify the scheduler now hydrates from / writes
 * through to DatabaseManager's bot_scheduled_tasks store, and degrades
 * gracefully (in-memory only) when the database is unavailable.
 */
import { BotTaskScheduler } from '@src/server/services/BotTaskScheduler';

// --- Mock DatabaseManager singleton ---
const isConnected = jest.fn();
const getBotScheduledTasks = jest.fn();
const upsertBotScheduledTask = jest.fn();
const deleteBotScheduledTask = jest.fn();

jest.mock('@src/database/DatabaseManager', () => ({
  DatabaseManager: {
    getInstance: () => ({
      isConnected,
      getBotScheduledTasks,
      upsertBotScheduledTask,
      deleteBotScheduledTask,
    }),
  },
}));

// Keep the scheduler's heavier collaborators out of these tests entirely.
jest.mock('@src/events/MessageBus', () => ({
  MessageBus: { getInstance: jest.fn() },
}));
jest.mock('@src/managers/BotManager', () => ({
  BotManager: { getInstance: jest.fn() },
}));

const sampleRecord = {
  id: 'task_persisted',
  botId: 'bot-1',
  botName: 'TestBot',
  prompt: 'Daily summary',
  intervalMs: 3600000,
  lastRun: undefined,
  nextRun: Date.now() + 3600000,
  enabled: true,
};

describe('BotTaskScheduler persistence', () => {
  let scheduler: BotTaskScheduler;

  beforeEach(() => {
    jest.clearAllMocks();
    isConnected.mockReturnValue(true);
    getBotScheduledTasks.mockResolvedValue([]);
    upsertBotScheduledTask.mockResolvedValue(undefined);
    deleteBotScheduledTask.mockResolvedValue(true);
    scheduler = new BotTaskScheduler();
  });

  const loadTasks = (s: BotTaskScheduler): Promise<void> =>
    (s as unknown as { loadTasks: () => Promise<void> }).loadTasks();

  it('hydrates tasks from the database on load', async () => {
    getBotScheduledTasks.mockResolvedValue([sampleRecord]);

    await loadTasks(scheduler);

    expect(getBotScheduledTasks).toHaveBeenCalledTimes(1);
    expect(scheduler.getTasksForBot('bot-1')).toEqual([sampleRecord]);
  });

  it('starts empty without touching the store when the database is not connected', async () => {
    isConnected.mockReturnValue(false);

    await loadTasks(scheduler);

    expect(getBotScheduledTasks).not.toHaveBeenCalled();
    expect(scheduler.getTasksForBot('bot-1')).toEqual([]);
  });

  it('persists newly scheduled tasks', async () => {
    const task = await scheduler.scheduleTask('bot-1', 'TestBot', 'Hourly check-in', 60);

    expect(upsertBotScheduledTask).toHaveBeenCalledTimes(1);
    expect(upsertBotScheduledTask).toHaveBeenCalledWith(task);
    expect(scheduler.getTasksForBot('bot-1')).toEqual([task]);
  });

  it('still schedules in memory when persistence fails', async () => {
    upsertBotScheduledTask.mockRejectedValue(new Error('disk full'));

    const task = await scheduler.scheduleTask('bot-1', 'TestBot', 'Hourly check-in', 60);

    expect(scheduler.getTasksForBot('bot-1')).toEqual([task]);
  });

  it('deletes tasks from memory and the database', async () => {
    const task = await scheduler.scheduleTask('bot-1', 'TestBot', 'Hourly check-in', 60);

    scheduler.deleteTask(task.id);

    expect(scheduler.getTasksForBot('bot-1')).toEqual([]);
    expect(deleteBotScheduledTask).toHaveBeenCalledWith(task.id);
  });

  it('start() loads persisted tasks and stop() clears the loop', async () => {
    jest.useFakeTimers();
    try {
      getBotScheduledTasks.mockResolvedValue([sampleRecord]);

      scheduler.start();
      // Let the async loadTasks settle without advancing the 60s loop.
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();

      expect(scheduler.getTasksForBot('bot-1')).toEqual([sampleRecord]);
    } finally {
      scheduler.stop();
      jest.useRealTimers();
    }
  });
});
