import express from 'express';
import request from 'supertest';
import { globalErrorHandler } from '@src/middleware/errorHandler';

// Define mocks before the router import
const mockGetBot = jest.fn();
const mockStartBot = jest.fn();
const mockStopBot = jest.fn();

const mockManager = {
  getBot: mockGetBot,
  startBot: mockStartBot,
  stopBot: mockStopBot,
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

// NOW import the router
import botsRouter from '@src/server/routes/bots';

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
    mockGetBot.mockResolvedValue({ id: 'bot-1', name: 'Bot One', isActive: false });
    mockStartBot.mockResolvedValue(true);

    const res = await request(app).post('/api/bots/bot-1/toggle').send({});

    expect(res.status).toBe(200);
    expect(mockStartBot).toHaveBeenCalledWith('bot-1');
    expect(mockStopBot).not.toHaveBeenCalled();
    expect(res.body).toMatchObject({
      success: true,
      data: { id: 'bot-1', isActive: true, status: 'active' },
    });
  });

  it('stops an active bot and returns the new inactive state', async () => {
    mockGetBot.mockResolvedValue({ id: 'bot-2', name: 'Bot Two', isActive: true });
    mockStopBot.mockResolvedValue(true);

    const res = await request(app).post('/api/bots/bot-2/toggle').send({});

    expect(res.status).toBe(200);
    expect(mockStopBot).toHaveBeenCalledWith('bot-2');
    expect(mockStartBot).not.toHaveBeenCalled();
    expect(res.body).toMatchObject({
      success: true,
      data: { id: 'bot-2', isActive: false, status: 'disabled' },
    });
  });

  it('returns 404 when the bot does not exist', async () => {
    mockGetBot.mockResolvedValue(null);

    const res = await request(app).post('/api/bots/missing/toggle').send({});

    expect(res.status).toBe(404);
    expect(mockStartBot).not.toHaveBeenCalled();
    expect(mockStopBot).not.toHaveBeenCalled();
  });
});
