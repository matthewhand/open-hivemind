import 'reflect-metadata';
import express from 'express';
import request from 'supertest';
import providerRouter from '../../src/server/routes/admin/llmProviders';

// Shared mock provider
const mockLlmProvider = {
  generateChatCompletion: jest.fn(),
};

// Mock PluginLoader BEFORE importing the router
jest.mock('../../src/plugins/PluginLoader', () => ({
  loadPlugin: jest.fn().mockResolvedValue({}),
  instantiateLlmProvider: jest.fn(() => mockLlmProvider),
}));

// Mock auth middleware
jest.mock('../../src/auth/middleware', () => ({
  authenticate: (req: any, res: any, next: any) => {
    req.user = { id: 'test', isAdmin: true };
    next();
  },
  requireAdmin: (req: any, res: any, next: any) => next(),
}));

// Mock tsyringe
jest.mock('tsyringe', () => ({
  container: {
    resolve: jest.fn((token) => {
      return { syncLlmEndpoints: jest.fn() };
    }),
  },
  singleton: () => (target: any) => target,
  injectable: () => (target: any) => target,
  inject: () => (target: any) => target,
}));

describe('LLM Provider Test Connection API', () => {
  let app: express.Express;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/admin', providerRouter);
  });

  it('should successfully test a provider connection', async () => {
    mockLlmProvider.generateChatCompletion.mockResolvedValue('Hello there!');

    const response = await request(app)
      .post('/api/admin/providers/test-connection')
      .send({
        providerType: 'openai',
        config: { apiKey: 'test-key' },
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(mockLlmProvider.generateChatCompletion).toHaveBeenCalled();
  });

  it('should handle provider connection failures', async () => {
    mockLlmProvider.generateChatCompletion.mockRejectedValue(new Error('Invalid API Key'));

    const response = await request(app)
      .post('/api/admin/providers/test-connection')
      .send({
        providerType: 'openai',
        config: { apiKey: 'invalid-key' },
      });

    // The route returns 200 but body.success is false
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('Connection test failed');
  });

  it('should return 400 for invalid provider type', async () => {
    const response = await request(app)
      .post('/api/admin/providers/test-connection')
      .send({
        providerType: 'non-existent',
        config: { apiKey: 'test' },
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Invalid provider type');
  });
});
