/**
 * Unit tests for the POST /api/bots/:id/toggle route handler.
 *
 * Regression coverage for the bots-toggle-route bug: the BotsPage enable/disable
 * toggle (useBotActions.ts) POSTs to /api/bots/:id/toggle, but the router only
 * defined /start and /stop — so the toggle was dead (404). These tests assert
 * the route exists, flips the bot's active state via the existing start/stop
 * logic, and returns the new state.
 */

import express from 'express';
import request from 'supertest';

// --- Mock BotManager so the route uses a controllable in-memory manager ---
const getBot = jest.fn();
const startBot = jest.fn();
const stopBot = jest.fn();

const mockManager = {
  getBot,
  startBot,
  stopBot,
};

jest.mock('@src/managers/BotManager', () => ({
  BotManager: {
    getInstance: jest.fn(async () => mockManager),
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

describe('POST /api/bots/:id/toggle', () => {
  let app: express.Application;

  beforeEach(() => {
    jest.clearAllMocks();
    app = createApp();
  });

  it('starts an inactive bot and returns the new active state', async () => {
    getBot.mockResolvedValue({ id: 'bot-1', name: 'Bot One', isActive: false });
    startBot.mockResolvedValue(true);

    const res = await request(app).post('/api/bots/bot-1/toggle').send({});

    expect(res.status).toBe(200);
    expect(startBot).toHaveBeenCalledWith('bot-1');
    expect(stopBot).not.toHaveBeenCalled();
    expect(res.body).toMatchObject({
      success: true,
      data: { id: 'bot-1', isActive: true, status: 'active' },
    });
  });

  it('stops an active bot and returns the new inactive state', async () => {
    getBot.mockResolvedValue({ id: 'bot-2', name: 'Bot Two', isActive: true });
    stopBot.mockResolvedValue(true);

    const res = await request(app).post('/api/bots/bot-2/toggle').send({});

    expect(res.status).toBe(200);
    expect(stopBot).toHaveBeenCalledWith('bot-2');
    expect(startBot).not.toHaveBeenCalled();
    expect(res.body).toMatchObject({
      success: true,
      data: { id: 'bot-2', isActive: false, status: 'disabled' },
    });
  });

  it('returns 404 when the bot does not exist', async () => {
    getBot.mockResolvedValue(null);

    const res = await request(app).post('/api/bots/missing/toggle').send({});

    expect(res.status).toBe(404);
    expect(startBot).not.toHaveBeenCalled();
    expect(stopBot).not.toHaveBeenCalled();
  });
});
