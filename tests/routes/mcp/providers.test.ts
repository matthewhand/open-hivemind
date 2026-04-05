import request from 'supertest';
import express from 'express';
import mcpProvidersRouter from '../../../src/server/routes/mcp/providers';

// Mock MCPProviderManager
jest.mock('../../../src/config/MCPProviderManager', () => ({
  getAllProviders: jest.fn().mockReturnValue([
    { id: 'provider1', name: 'Test Provider 1', type: 'tool', enabled: true },
    { id: 'provider2', name: 'Test Provider 2', type: 'tool', enabled: false },
  ]),
  getAllProviderStatuses: jest.fn().mockReturnValue({
    provider1: { id: 'provider1', status: 'running', lastCheck: new Date() },
    provider2: { id: 'provider2', status: 'stopped', lastCheck: new Date() },
  }),
  getTemplates: jest.fn().mockReturnValue([
    { id: 'template1', name: 'Template 1', description: 'Test template' },
  ]),
  getStats: jest.fn().mockReturnValue({
    total: 2,
    enabled: 1,
    running: 1,
  }),
  getProvider: jest.fn().mockImplementation((id: string) => {
    if (id === 'provider1') {
      return { id: 'provider1', name: 'Test Provider 1', type: 'tool', enabled: true };
    }
    return undefined;
  }),
  createProvider: jest.fn().mockImplementation((config: any) => Promise.resolve({
    id: 'new-provider',
    ...config,
  })),
  updateProvider: jest.fn().mockImplementation((id: string, config: any) => {
    if (id === 'provider1') {
      return Promise.resolve({ id, ...config });
    }
    return Promise.reject(new Error('Provider not found'));
  }),
  deleteProvider: jest.fn().mockImplementation((id: string) => {
    if (id === 'provider1') {
      return Promise.resolve();
    }
    return Promise.reject(new Error('Provider not found'));
  }),
  startProvider: jest.fn().mockImplementation((id: string) => {
    if (id === 'provider1') {
      return Promise.resolve(true);
    }
    return Promise.reject(new Error('Provider not found'));
  }),
  stopProvider: jest.fn().mockImplementation((id: string) => {
    if (id === 'provider1') {
      return Promise.resolve(true);
    }
    return Promise.reject(new Error('Provider not found'));
  }),
}));

// Mock authenticateToken middleware
jest.mock('../../../src/server/middleware/auth', () => ({
  authenticateToken: (req: any, res: any, next: any) => next(),
}));

describe('MCP Providers Router', () => {
  let app: express.Application;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/mcp', mcpProvidersRouter);
  });

  describe('GET /api/mcp/providers', () => {
    it('should return all providers with status', async () => {
      const res = await request(app).get('/api/mcp/providers');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0]).toHaveProperty('status');
    });
  });

  describe('GET /api/mcp/providers/templates', () => {
    it('should return provider templates', async () => {
      const res = await request(app).get('/api/mcp/providers/templates');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toBe('Template 1');
    });
  });

  describe('GET /api/mcp/providers/stats', () => {
    it('should return provider statistics', async () => {
      const res = await request(app).get('/api/mcp/providers/stats');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.total).toBe(2);
      expect(res.body.data.enabled).toBe(1);
    });
  });

  describe('GET /api/mcp/providers/:id', () => {
    it('should return 404 for non-existent provider', async () => {
      const res = await request(app).get('/api/mcp/providers/nonexistent');

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/mcp/providers/:id/start', () => {
    it('should start a provider', async () => {
      const res = await request(app).post('/api/mcp/providers/provider1/start');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 404 for non-existent provider', async () => {
      const res = await request(app).post('/api/mcp/providers/nonexistent/start');

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/mcp/providers/:id/stop', () => {
    it('should stop a provider', async () => {
      const res = await request(app).post('/api/mcp/providers/provider1/stop');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 404 for non-existent provider', async () => {
      const res = await request(app).post('/api/mcp/providers/nonexistent/stop');

      expect(res.status).toBe(404);
    });
  });
});
