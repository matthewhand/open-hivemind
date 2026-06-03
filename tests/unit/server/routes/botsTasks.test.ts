/**
 * Unit tests for the bot scheduled-task CRUD routes:
 *   GET    /api/bots/:id/tasks          - list tasks for a bot
 *   DELETE /api/bots/:id/tasks/:taskId  - delete a scheduled task
 *
 * The router already exposed POST /:id/tasks (scheduleTask) but had no
 * list/get/delete endpoints, leaving task management incomplete. These tests
 * cover the new GET (list) and DELETE routes, which reuse the existing
 * BotTaskScheduler.getTasksForBot / deleteTask methods.
 */

import express from 'express';
import request from 'supertest';

// --- Mock BotManager so the route uses a controllable in-memory manager ---
const getBot = jest.fn();

const mockManager = {
  getBot,
};

jest.mock('@src/managers/BotManager', () => ({
  BotManager: {
    getInstance: jest.fn(async () => mockManager),
  },
}));

// --- Mock BotTaskScheduler singleton ---
const getTasksForBot = jest.fn();
const deleteTask = jest.fn();

jest.mock('@src/server/services/BotTaskScheduler', () => ({
  BotTaskScheduler: {
    getInstance: jest.fn(() => ({
      getTasksForBot,
      deleteTask,
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
import { globalErrorHandler } from '@src/middleware/errorHandler';

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
    getBot.mockResolvedValue({ id: 'bot-1', name: 'Bot One' });
    getTasksForBot.mockReturnValue([sampleTask]);

    const res = await request(app).get('/api/bots/bot-1/tasks');

    expect(res.status).toBe(200);
    expect(getTasksForBot).toHaveBeenCalledWith('bot-1');
    expect(res.body).toMatchObject({
      success: true,
      data: [{ id: 'task_1', botId: 'bot-1' }],
    });
  });

  it('returns an empty list when the bot has no tasks', async () => {
    getBot.mockResolvedValue({ id: 'bot-1', name: 'Bot One' });
    getTasksForBot.mockReturnValue([]);

    const res = await request(app).get('/api/bots/bot-1/tasks');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, data: [] });
  });

  it('returns 404 when the bot does not exist', async () => {
    getBot.mockResolvedValue(null);

    const res = await request(app).get('/api/bots/missing/tasks');

    expect(res.status).toBe(404);
    expect(getTasksForBot).not.toHaveBeenCalled();
  });
});

describe('DELETE /api/bots/:id/tasks/:taskId', () => {
  let app: express.Application;

  beforeEach(() => {
    jest.clearAllMocks();
    app = createApp();
  });

  it('deletes an existing task and returns the deleted id', async () => {
    getBot.mockResolvedValue({ id: 'bot-1', name: 'Bot One' });
    getTasksForBot.mockReturnValue([sampleTask]);

    const res = await request(app).delete('/api/bots/bot-1/tasks/task_1');

    expect(res.status).toBe(200);
    expect(deleteTask).toHaveBeenCalledWith('task_1');
    expect(res.body).toMatchObject({
      success: true,
      data: { id: 'task_1', deleted: true },
    });
  });

  it('returns 404 when the bot does not exist', async () => {
    getBot.mockResolvedValue(null);

    const res = await request(app).delete('/api/bots/missing/tasks/task_1');

    expect(res.status).toBe(404);
    expect(deleteTask).not.toHaveBeenCalled();
  });

  it('returns 404 when the task does not belong to the bot', async () => {
    getBot.mockResolvedValue({ id: 'bot-1', name: 'Bot One' });
    getTasksForBot.mockReturnValue([sampleTask]);

    const res = await request(app).delete('/api/bots/bot-1/tasks/unknown-task');

    expect(res.status).toBe(404);
    expect(deleteTask).not.toHaveBeenCalled();
  });
});
