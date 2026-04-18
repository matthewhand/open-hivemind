import 'reflect-metadata';
import express from 'express';
import request from 'supertest';
import router from '../../../src/server/routes/demo';

const mockDemoService = {
  getDemoStatus: jest.fn(),
  getDemoBots: jest.fn(),
  isInDemoMode: jest.fn(),
  setDemoMode: jest.fn(),
  addMessage: jest.fn(),
  generateDemoResponse: jest.fn(),
  getAllConversations: jest.fn(),
  getConversationHistory: jest.fn(),
  reset: jest.fn(),
};

// Mock tsyringe BEFORE importing the router
jest.mock('tsyringe', () => ({
  container: {
    resolve: jest.fn((token) => {
      if (token.name === 'DemoModeService' || token.toString().includes('DemoModeService')) {
        return mockDemoService;
      }
      return {};
    }),
  },
  singleton: () => (target: any) => target,
  injectable: () => (target: any) => target,
  inject: () => (target: any) => target,
}));

jest.mock('../../../src/auth/middleware', () => ({
  authenticate: (req: any, res: any, next: any) => {
    req.user = { id: 'admin', role: 'admin' };
    next();
  },
  requireAdmin: (req: any, res: any, next: any) => next(),
}));

// Mock WebSocketService to prevent resolution issues
jest.mock('../../../src/server/services/WebSocketService', () => ({
  WebSocketService: {
    getInstance: jest.fn(() => ({
      broadcastConfigChange: jest.fn(),
    })),
  },
}));

describe('Demo Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/demo', router);
  });

  describe('GET /demo/status', () => {
    it('should return demo status when in demo mode', async () => {
      mockDemoService.getDemoStatus.mockReturnValue({ isDemoMode: true });

      const res = await request(app).get('/demo/status');
      expect(res.status).toBe(200);
      expect(res.body.data.isDemoMode).toBe(true);
      expect(res.body.data.message).toContain('demo mode');
    });
  });

  describe('POST /demo/toggle', () => {
    it('should toggle demo mode', async () => {
      mockDemoService.isInDemoMode.mockReturnValueOnce(false).mockReturnValue(true);

      const res = await request(app).post('/demo/toggle');
      expect(res.status).toBe(200);
      expect(res.body.data.enabled).toBe(true);
      expect(mockDemoService.setDemoMode).toHaveBeenCalledWith(true);
    });
  });

  describe('GET /demo/bots', () => {
    it('should return demo bots', async () => {
      mockDemoService.getDemoBots.mockReturnValue([{ name: 'TestBot' }]);
      mockDemoService.isInDemoMode.mockReturnValue(true);

      const res = await request(app).get('/demo/bots');
      expect(res.status).toBe(200);
      expect(res.body.data.bots).toHaveLength(1);
      expect(res.body.data.isDemo).toBe(true);
    });
  });

  describe('POST /demo/chat', () => {
    it('should return 400 when message is missing', async () => {
      const res = await request(app).post('/demo/chat').send({ botName: 'Bot' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
    });

    it('should return chat response in demo mode', async () => {
      mockDemoService.isInDemoMode.mockReturnValue(true);
      mockDemoService.addMessage.mockReturnValue({ id: '1', text: 'response' });
      mockDemoService.generateDemoResponse.mockReturnValue('Hello back!');

      const res = await request(app)
        .post('/demo/chat')
        .send({ message: 'hello', botName: 'TestBot' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isDemo).toBe(true);
    });
  });

  describe('POST /demo/reset', () => {
    it('should reset demo mode', async () => {
      const res = await request(app).post('/demo/reset');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockDemoService.reset).toHaveBeenCalledTimes(1);
    });
  });

  describe('GET /demo/info', () => {
    it('should return static demo info', async () => {
      const res = await request(app).get('/demo/info');
      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('Open-Hivemind Demo Mode');
    });
  });
});
