import request from 'supertest';
import express from 'express';
import adminConfigRouter from '../../../src/server/routes/admin/config';

// Mock webUIStorage
jest.mock('../../../src/storage/webUIStorage', () => ({
  webUIStorage: {
    getLlmProviders: jest.fn().mockReturnValue([
      { id: 'openai', name: 'OpenAI', type: 'openai', isActive: true },
      { id: 'anthropic', name: 'Anthropic', type: 'anthropic', isActive: false },
    ]),
    getMessengerProviders: jest.fn().mockReturnValue([
      { id: 'discord', name: 'Discord', type: 'discord', isActive: true },
    ]),
    getLlmProvider: jest.fn().mockImplementation((id: string) => {
      if (id === 'openai') {
        return { id: 'openai', name: 'OpenAI', type: 'openai', isActive: true };
      }
      return null;
    }),
    createLlmProvider: jest.fn().mockResolvedValue({ id: 'new-provider', name: 'New Provider' }),
    updateLlmProvider: jest.fn().mockResolvedValue(true),
    deleteLlmProvider: jest.fn().mockResolvedValue(true),
    toggleLlmProvider: jest.fn().mockResolvedValue(true),
    toggleMessengerProvider: jest.fn().mockResolvedValue(true),
  },
}));

// Mock ApiMonitorService
jest.mock('../../../src/services/ApiMonitorService', () => ({
  __esModule: true,
  default: {
    getInstance: jest.fn().mockReturnValue({
      getMetrics: jest.fn().mockReturnValue({ totalRequests: 100, errorRate: 0.01 }),
      getEndpointMetrics: jest.fn().mockReturnValue([]),
    }),
  },
}));

// Mock authenticateToken middleware
jest.mock('../../../src/server/middleware/auth', () => ({
  authenticateToken: (req: any, res: any, next: any) => next(),
}));

describe('Admin Config Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/admin', adminConfigRouter);
  });

  describe('GET /api/admin/llm-providers', () => {
    it('should return all LLM providers', async () => {
      const res = await request(app).get('/api/admin/llm-providers');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.providers).toHaveLength(2);
      expect(res.body.data.providers[0].name).toBe('OpenAI');
    });
  });

  describe('GET /api/admin/messenger-providers', () => {
    it('should return all messenger providers', async () => {
      const res = await request(app).get('/api/admin/messenger-providers');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.providers).toHaveLength(1);
      expect(res.body.data.providers[0].name).toBe('Discord');
    });
  });

  describe('GET /api/admin/llm-providers/:id', () => {
    it('should return 404 for non-existent provider', async () => {
      const res = await request(app).get('/api/admin/llm-providers/nonexistent');

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/admin/llm-providers', () => {
    it('should return 400 for invalid provider data', async () => {
      const res = await request(app)
        .post('/api/admin/llm-providers')
        .send({});

      expect(res.status).toBe(400);
    });
  });
});
