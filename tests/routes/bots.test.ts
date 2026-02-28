import express from 'express';
import request from 'supertest';
import { BotManager } from '../../src/managers/BotManager';
import { WebSocketService } from '../../src/server/services/WebSocketService';

// Mock BotManager
jest.mock('../../src/managers/BotManager');

// Mock WebSocketService
jest.mock('../../src/server/services/WebSocketService');

// Mock ActivityLogger
jest.mock('../../src/server/services/ActivityLogger', () => ({
  ActivityLogger: {
    getInstance: jest.fn().mockReturnValue({
      getEvents: jest.fn().mockResolvedValue([]),
    }),
  },
}));

// Mock auth middleware
jest.mock('../../src/auth/middleware', () => ({
  requireRole: jest.fn().mockImplementation((role) => (req: any, res: any, next: any) => next()),
}));

// Mock ShutdownCoordinator to prevent process exit during tests
jest.mock('../../src/server/ShutdownCoordinator', () => ({
  ShutdownCoordinator: {
    getInstance: jest.fn().mockReturnValue({
      registerHttpServer: jest.fn(),
      registerViteServer: jest.fn(),
      registerMessengerService: jest.fn(),
      registerService: jest.fn(),
      isShuttingDownNow: jest.fn().mockReturnValue(false),
      setupSignalHandlers: jest.fn(),
      initiateShutdown: jest.fn(),
    }),
  },
  default: {
    getInstance: jest.fn().mockReturnValue({
      registerHttpServer: jest.fn(),
      registerViteServer: jest.fn(),
      registerMessengerService: jest.fn(),
      registerService: jest.fn(),
      isShuttingDownNow: jest.fn().mockReturnValue(false),
      setupSignalHandlers: jest.fn(),
      initiateShutdown: jest.fn(),
    }),
  },
}));

// Mock authenticateToken middleware
jest.mock('../../src/server/middleware/auth', () => ({
  authenticateToken: (req: any, res: any, next: any) => next(),
}));

// Mock ShutdownCoordinator to prevent process.exit
jest.mock('../../src/server/ShutdownCoordinator', () => ({
  ShutdownCoordinator: {
    getInstance: jest.fn().mockReturnValue({
      initiateShutdown: jest.fn(),
    }),
  },
}));

describe('Bots Router', () => {
  let app: express.Application;
  let mockManager: any;
  let mockWsService: any;
  let botsRouter: any;
  let processExitSpy: jest.SpyInstance;

  beforeAll(() => {
    // Mock process.exit to prevent Jest from crashing if ShutdownCoordinator triggers it
    processExitSpy = jest.spyOn(process, 'exit').mockImplementation((code?: number) => {
      console.log(`process.exit called with ${code}`);
      return undefined as never;
    });
  });

  afterAll(() => {
    processExitSpy.mockRestore();
  });

  beforeEach(() => {
    jest.clearAllMocks();

    mockManager = {
      getAllBots: jest.fn(),
      getBotsStatus: jest.fn(),
      getBot: jest.fn(),
      createBot: jest.fn(),
      updateBot: jest.fn(),
      deleteBot: jest.fn(),
      cloneBot: jest.fn(),
      startBot: jest.fn(),
      stopBot: jest.fn(),
      getBotHistory: jest.fn(),
    };

    mockWsService = {
      getBotStats: jest.fn(),
    };

    // Correctly mock the static getInstance method for BotManager
    (BotManager.getInstance as jest.Mock).mockReturnValue(mockManager);

    // Correctly mock the static getInstance method for WebSocketService
    (WebSocketService.getInstance as jest.Mock).mockReturnValue(mockWsService);

    // Re-require router to ensure it picks up the mock return value
    jest.isolateModules(() => {
      botsRouter = require('../../src/server/routes/bots').default;
    });

    app = express();
    app.use(express.json());
    app.use('/api/bots', botsRouter);
  });

  it('GET /api/bots should return list of bots with status and metrics', async () => {
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

    // Mock WebSocketService responses
    mockWsService.getBotStats.mockImplementation((name: string) => {
      if (name === 'Bot 1') {
        return { messageCount: 10, errors: ['error1', 'error2'], errorCount: 2 };
      } else {
        return { messageCount: 0, errors: [], errorCount: 0 };
      }
    });

    const res = await request(app).get('/api/bots');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);

    // Verify Bot 1
    expect(res.body[0]).toMatchObject({
      id: 'bot1',
      status: 'active',
      connected: true,
      messageCount: 10,
      errorCount: 2,
    });

    // Verify Bot 2
    expect(res.body[1]).toMatchObject({
      id: 'bot2',
      status: 'disabled',
      connected: false,
      messageCount: 0,
      errorCount: 0,
    });

    // Ensure getBotStats was called for each bot
    expect(mockWsService.getBotStats).toHaveBeenCalledWith('Bot 1');
    expect(mockWsService.getBotStats).toHaveBeenCalledWith('Bot 2');
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
    mockManager.getBot.mockResolvedValue({ id: 'bot1', name: 'bot1' });
    const res = await request(app).get('/api/bots/bot1/activity');
    expect(res.status).toBe(200);
    expect(res.body.data.activity).toEqual([]);
  });

  // Error case tests
  describe('POST /api/bots', () => {
    it('should create a bot successfully', async () => {
      const newBot = { name: 'test-bot', messageProvider: 'discord', llmProvider: 'openai' };
      mockManager.createBot.mockResolvedValue(newBot);

      const res = await request(app).post('/api/bots').send(newBot);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.bot).toEqual(newBot);
      expect(mockManager.createBot).toHaveBeenCalledWith(expect.objectContaining(newBot));
    });

    it('should return 400 if name is missing', async () => {
      const res = await request(app).post('/api/bots').send({ messageProvider: 'discord' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Bot name is required');
    });
  });

  describe('PUT /api/bots/:id', () => {
    it('should update a bot successfully', async () => {
      const updates = { persona: 'new-persona' };
      const updatedBot = { id: 'test-bot', name: 'test-bot', ...updates };
      mockManager.updateBot.mockResolvedValue(updatedBot);

      const res = await request(app).put('/api/bots/test-bot').send(updates);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.bot).toEqual(updatedBot);
      expect(mockManager.updateBot).toHaveBeenCalledWith('test-bot', updates);
    });

    it('should return 404 if bot not found', async () => {
      mockManager.updateBot.mockRejectedValue(new Error('Bot "unknown" not found'));
      const res = await request(app).put('/api/bots/unknown').send({});
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/bots/:id', () => {
    it('should delete a bot successfully', async () => {
      mockManager.deleteBot.mockResolvedValue(undefined);

      const res = await request(app).delete('/api/bots/test-bot');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockManager.deleteBot).toHaveBeenCalledWith('test-bot');
    });

    it('should return 404 if bot not found', async () => {
      mockManager.deleteBot.mockRejectedValue(new Error('Bot "unknown" not found'));
      const res = await request(app).delete('/api/bots/unknown');
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/bots/:id/clone', () => {
    it('should clone a bot successfully', async () => {
      const clonedBot = { id: 'cloned-bot', name: 'cloned-bot' };
      mockManager.cloneBot.mockResolvedValue(clonedBot);

      const res = await request(app)
        .post('/api/bots/test-bot/clone')
        .send({ newName: 'cloned-bot' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.bot).toEqual(clonedBot);
      expect(mockManager.cloneBot).toHaveBeenCalledWith('test-bot', 'cloned-bot');
    });

    it('should return 400 if newName is missing', async () => {
      const res = await request(app).post('/api/bots/test-bot/clone').send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('New bot name is required');
    });
  });

  describe('GET /api/bots/:id/history', () => {
    it('should clamp limit to valid range (1-100)', async () => {
      mockManager.getBotHistory.mockResolvedValue([]);

      // Test negative value
      const res1 = await request(app).get('/api/bots/bot1/history?limit=-5');
      expect(mockManager.getBotHistory).toHaveBeenCalledWith('bot1', undefined, 1);

      // Test value > 100
      const res2 = await request(app).get('/api/bots/bot1/history?limit=500');
      expect(mockManager.getBotHistory).toHaveBeenCalledWith('bot1', undefined, 100);
    });

    it('should return 404 if bot not found', async () => {
      mockManager.getBotHistory.mockRejectedValue(new Error('Bot "unknown" not found'));
      const res = await request(app).get('/api/bots/unknown/history');
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/bots/:id/start', () => {
    it('should return 404 if bot not found', async () => {
      mockManager.startBot.mockRejectedValue(new Error('Bot "unknown" not found'));
      const res = await request(app).post('/api/bots/unknown/start');
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/bots/:id/stop', () => {
    it('should return 404 if bot not found', async () => {
      mockManager.stopBot.mockRejectedValue(new Error('Bot "unknown" not found'));
      const res = await request(app).post('/api/bots/unknown/stop');
      expect(res.status).toBe(404);
    });
  });
});
