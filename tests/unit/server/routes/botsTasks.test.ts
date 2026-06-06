import express from 'express';
import request from 'supertest';
import { globalErrorHandler } from '@src/middleware/errorHandler';

// --- Mock BotManager so the route uses a controllable in-memory manager ---
const mockGetBot = jest.fn();

const mockManager = {
  getBot: mockGetBot,
};

jest.mock('@src/managers/BotManager', () => ({
  BotManager: {
    getInstance: jest.fn(async () => mockManager),
  },
}));

// --- Mock BotTaskScheduler singleton ---
const mockGetTasksForBot = jest.fn();
const mockDeleteTask = jest.fn();

jest.mock('@src/server/services/BotTaskScheduler', () => ({
  BotTaskScheduler: {
    getInstance: jest.fn(() => ({
      getTasksForBot: mockGetTasksForBot,
      deleteTask: mockDeleteTask,
    })),
  },
}));

// Avoid pulling heavy singletons during router import.
jest.mock('@src/server/services/WebSocketService', () => ({
  WebSocketService: {
    getInstance: jest.fn(() => {
      throw new Error('DI not ready');
    }),
  },
}));

// Import the router AFTER the mocks are registered.
import botsRouter from '@src/server/routes/bots';

function createApp(): express.Application {
  const app = express();
  app.use(express.json());
  app.use('/api/bots', botsRouter);
  app.use(globalErrorHandler);
  return app;
}

const sampleTask = {
  id: 'task_1',
  botId: 'bot-1',
  botName: 'Bot One',
  prompt: 'do a thing',
  intervalMs: 60000,
  nextRun: Date.now() + 60000,
  enabled: true,
};

describe('GET /api/bots/:id/tasks', () => {
  let app: express.Application;

  beforeEach(() => {
    jest.clearAllMocks();
    app = createApp();
  });

  it('returns the scheduled tasks for an existing bot', async () => {
    mockGetBot.mockResolvedValue({ id: 'bot-1', name: 'Bot One' });
    mockGetTasksForBot.mockReturnValue([sampleTask]);

    const res = await request(app).get('/api/bots/bot-1/tasks');

    expect(res.status).toBe(200);
    expect(mockGetTasksForBot).toHaveBeenCalledWith('bot-1');
    expect(res.body).toMatchObject({
      success: true,
      data: [{ id: 'task_1', botId: 'bot-1' }],
    });
  });

  it('returns an empty list when the bot has no tasks', async () => {
    mockGetBot.mockResolvedValue({ id: 'bot-1', name: 'Bot One' });
    mockGetTasksForBot.mockReturnValue([]);

    const res = await request(app).get('/api/bots/bot-1/tasks');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, data: [] });
  });

  it('returns 404 when the bot does not exist', async () => {
    mockGetBot.mockResolvedValue(null);

    const res = await request(app).get('/api/bots/missing/tasks');

    expect(res.status).toBe(404);
    expect(mockGetTasksForBot).not.toHaveBeenCalled();
  });
});

describe('DELETE /api/bots/:id/tasks/:taskId', () => {
  let app: express.Application;

  beforeEach(() => {
    jest.clearAllMocks();
    app = createApp();
  });

  it('deletes an existing task and returns the deleted id', async () => {
    mockGetBot.mockResolvedValue({ id: 'bot-1', name: 'Bot One' });
    mockGetTasksForBot.mockReturnValue([sampleTask]);

    const res = await request(app).delete('/api/bots/bot-1/tasks/task_1');

    expect(res.status).toBe(200);
    expect(mockDeleteTask).toHaveBeenCalledWith('task_1');
    expect(res.body).toMatchObject({
      success: true,
      data: { id: 'task_1', deleted: true },
    });
  });

  it('returns 404 when the bot does not exist', async () => {
    mockGetBot.mockResolvedValue(null);

    const res = await request(app).delete('/api/bots/missing/tasks/task_1');

    expect(res.status).toBe(404);
    expect(mockDeleteTask).not.toHaveBeenCalled();
  });

  it('returns 404 when the task does not belong to the bot', async () => {
    mockGetBot.mockResolvedValue({ id: 'bot-1', name: 'Bot One' });
    mockGetTasksForBot.mockReturnValue([sampleTask]);

    const res = await request(app).delete('/api/bots/bot-1/tasks/unknown-task');

    expect(res.status).toBe(404);
    expect(mockDeleteTask).not.toHaveBeenCalled();
  });
});
