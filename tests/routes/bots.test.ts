import express from 'express';
import request from 'supertest';
import { BotManager } from '../../src/managers/BotManager';

// Mock BotManager
jest.mock('../../src/managers/BotManager');

// Mock authenticateToken middleware
jest.mock('../../src/server/middleware/auth', () => ({
  authenticateToken: (req: any, res: any, next: any) => next(),
}));

describe('Bots Router', () => {
  let app: express.Application;
  let mockManager: any;
  let botsRouter: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockManager = {
      getAllBots: jest.fn(),
      getBotsStatus: jest.fn(),
      createBot: jest.fn(),
      updateBot: jest.fn(),
      deleteBot: jest.fn(),
      cloneBot: jest.fn(),
      startBot: jest.fn(),
      stopBot: jest.fn(),
      getBotHistory: jest.fn(),
    };

    // Correctly mock the static getInstance method
    (BotManager.getInstance as jest.Mock).mockReturnValue(mockManager);

    // Re-require router to ensure it picks up the mock return value
    jest.isolateModules(() => {
        botsRouter = require('../../src/server/routes/bots').default;
    });

    app = express();
    app.use(express.json());
    app.use('/api/bots', botsRouter);
  });

  it('GET /api/bots should return list of bots with status', async () => {
    const mockBots = [
      { id: 'bot1', name: 'Bot 1', messageProvider: 'discord', isActive: true },
      { id: 'bot2', name: 'Bot 2', messageProvider: 'slack', isActive: false },
    ];
    const mockStatus = [
      { id: 'bot1', isRunning: true },
      { id: 'bot2', isRunning: false },
    ];

    mockManager.getAllBots.mockResolvedValue(mockBots);
    mockManager.getBotsStatus.mockResolvedValue(mockStatus);

    const res = await request(app).get('/api/bots');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0]).toMatchObject({
      id: 'bot1',
      status: 'active',
      connected: true,
    });
    expect(res.body[1]).toMatchObject({
      id: 'bot2',
      status: 'disabled',
      connected: false,
    });
  });

  it('POST /api/bots/:id/start should start a bot', async () => {
    mockManager.startBot.mockResolvedValue(true);
    const res = await request(app).post('/api/bots/bot1/start');
    expect(res.status).toBe(200);
    expect(mockManager.startBot).toHaveBeenCalledWith('bot1');
  });

  it('POST /api/bots/:id/stop should stop a bot', async () => {
    mockManager.stopBot.mockResolvedValue(true);
    const res = await request(app).post('/api/bots/bot1/stop');
    expect(res.status).toBe(200);
    expect(mockManager.stopBot).toHaveBeenCalledWith('bot1');
  });

  it('GET /api/bots/:id/history should return chat history', async () => {
    const mockHistory = [{ id: 'msg1', text: 'hello' }];
    mockManager.getBotHistory.mockResolvedValue(mockHistory);
    const res = await request(app).get('/api/bots/bot1/history');
    expect(res.status).toBe(200);
    expect(res.body.data.history).toEqual(mockHistory);
    expect(mockManager.getBotHistory).toHaveBeenCalledWith('bot1', undefined, 20);
  });

  it('GET /api/bots/:id/activity should return activity logs', async () => {
    const res = await request(app).get('/api/bots/bot1/activity');
    expect(res.status).toBe(200);
    expect(res.body.data.activity).toEqual([]);
  });
});
