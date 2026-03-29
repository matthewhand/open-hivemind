import express from 'express';
import request from 'supertest';
import adminRouter from '../../../src/server/routes/admin';

// Mock auth middleware
jest.mock('../../../src/auth/middleware', () => ({
  authenticate: (req: any, res: any, next: any) => {
    req.user = { id: 'admin1', username: 'admin', role: 'admin' };
    next();
  },
  requireAdmin: (req: any, res: any, next: any) => {
    next();
  }
}));

// Mock MCP Service
jest.mock('../../../src/mcp/MCPService', () => ({
  MCPService: {
    getInstance: jest.fn().mockReturnValue({
      getConnectedServers: jest.fn().mockReturnValue([{ name: 'mcp1', serverUrl: 'http://test.local', status: 'connected' }]),
      getConnectedServersWithMetadata: jest.fn().mockReturnValue([{ name: 'mcp1', serverUrl: 'http://test.local', status: 'connected' }]),
      getToolsFromServer: jest.fn().mockReturnValue([]),
    })
  }
}));

jest.mock('../../../src/config/trustedMcpRepos', () => ({
  getTrustedMcpReposConfig: jest.fn().mockReturnValue({ repos: [] }),
}));

// Mock webUIStorage
jest.mock('../../../src/storage/webUIStorage', () => ({
  webUIStorage: {
    getLlmProviders: jest.fn().mockReturnValue([{ id: 'llm1', name: 'OpenAI' }]),
    getMessengerProviders: jest.fn().mockReturnValue([{ id: 'msg1', name: 'Discord' }]),
    getPersonas: jest.fn().mockReturnValue([{ key: 'persona1', name: 'Developer', systemPrompt: 'Test' }]),
    getToolUsageGuards: jest.fn().mockReturnValue([{ id: 'guard1', name: 'Guard1', config: {} }]),
    getMcps: jest.fn().mockReturnValue([{ name: 'mcp1', serverUrl: 'http://test.local' }]),
    saveLlmProvider: jest.fn(),
    savePersona: jest.fn(),
  }
}));

jest.mock('../../../src/utils/envUtils', () => ({
  getRelevantEnvVars: jest.fn().mockReturnValue({ NODE_ENV: 'test' })
}));

const app = express();
app.use(express.json());
app.use('/api/admin', adminRouter);

describe('Admin Routes Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/admin/llm-providers', () => {
    it('returns llm providers', async () => {
      const res = await request(app).get('/api/admin/llm-providers');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data.providers).toHaveLength(1);
    });
  });

  describe('GET /api/admin/messenger-providers', () => {
    it('returns messenger providers', async () => {
      const res = await request(app).get('/api/admin/messenger-providers');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data.providers).toHaveLength(1);
    });
  });

  describe('GET /api/admin/personas', () => {
    it('returns personas', async () => {
      const res = await request(app).get('/api/admin/personas');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      // Depending on implementation it might combine default and stored
      expect(res.body.data.personas).toBeDefined();
    });
  });

  describe('GET /api/admin/env-overrides', () => {
    it('returns env overrides', async () => {
      const res = await request(app).get('/api/admin/env-overrides');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data.envVars).toBeDefined();
    });
  });

  describe('GET /api/admin/mcp-servers', () => {
    it('returns mcp servers', async () => {
      const res = await request(app).get('/api/admin/mcp-servers');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
    });
  });

  describe('POST /api/admin/llm-providers', () => {
    it('creates an llm provider', async () => {
      const webUIStorageMock = require('../../../src/storage/webUIStorage').webUIStorage;

      const res = await request(app)
        .post('/api/admin/llm-providers')
        .send({ name: 'Test', type: 'openai', config: { apiKey: '12345678' } });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(webUIStorageMock.saveLlmProvider).toHaveBeenCalled();
    });
  });

  describe('POST /api/admin/personas', () => {
    it('creates a persona', async () => {
      const webUIStorageMock = require('../../../src/storage/webUIStorage').webUIStorage;

      const res = await request(app)
        .post('/api/admin/personas')
        .send({ key: 'test', name: 'Test Persona', systemPrompt: 'You are a test' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(webUIStorageMock.savePersona).toHaveBeenCalled();
    });
  });

});
