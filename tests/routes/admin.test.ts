import express from 'express';
import request from 'supertest';
import adminRoutes from '../../src/server/routes/admin';

// Mock dependencies
jest.mock('../../src/storage/webUIStorage', () => ({
  __esModule: true,
  webUIStorage: {
    // In-memory provider stores for route tests
    _llmProviders: [{ id: 'llm1', name: 'LLM 1', type: 'openai', config: {}, isActive: true }],
    _messengerProviders: [
      { id: 'msg1', name: 'Messenger 1', type: 'discord', config: {}, isActive: true },
    ],

    getPersonas: jest.fn(() => []),
    savePersona: jest.fn(),
    deletePersona: jest.fn(),
    getMcps: jest.fn(() => []),
    saveMcp: jest.fn(),
    deleteMcp: jest.fn(),

    getLlmProviders: jest.fn(function () {
      return this._llmProviders;
    }),
    saveLlmProvider: jest.fn(function (provider: any) {
      const idx = this._llmProviders.findIndex((p: any) => p.id === provider.id);
      if (idx >= 0) this._llmProviders[idx] = provider;
      else this._llmProviders.push(provider);
    }),
    deleteLlmProvider: jest.fn(function (id: string) {
      this._llmProviders = this._llmProviders.filter((p: any) => p.id !== id);
    }),

    getMessengerProviders: jest.fn(function () {
      return this._messengerProviders;
    }),
    saveMessengerProvider: jest.fn(function (provider: any) {
      const idx = this._messengerProviders.findIndex((p: any) => p.id === provider.id);
      if (idx >= 0) this._messengerProviders[idx] = provider;
      else this._messengerProviders.push(provider);
    }),
    deleteMessengerProvider: jest.fn(function (id: string) {
      this._messengerProviders = this._messengerProviders.filter((p: any) => p.id !== id);
    }),
  },
}));

jest.mock('../../src/mcp/MCPService', () => ({
  MCPService: {
    getInstance: jest.fn(() => ({
      connectToServer: jest.fn(),
      disconnectFromServer: jest.fn(),
      getConnectedServers: jest.fn(() => []),
      getToolsFromServer: jest.fn(() => []),
    })),
  },
}));

jest.mock('../../src/utils/envUtils', () => ({
  getRelevantEnvVars: jest.fn(() => ({})),
}));

// Mock ToolUsageGuardsManager
jest.mock('../../src/managers/ToolUsageGuardsManager', () => ({
  ToolUsageGuardsManager: {
    getInstance: jest.fn(() => {
      const guards = new Map();
      // Add default test guard
      guards.set('guard1', {
        id: 'guard1',
        name: 'Test Guard',
        description: 'Test description',
        toolId: 'test_tool',
        guardType: 'owner_only',
        allowedUsers: [],
        allowedRoles: [],
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      return {
        getAllGuards: jest.fn(() => Array.from(guards.values())),
        getGuard: jest.fn((id: string) => guards.get(id)),
        createGuard: jest.fn((request: any) => {
          const newGuard = {
            id: `guard${Date.now()}`,
            name: request.name,
            description: request.description,
            toolId: request.toolId,
            guardType: request.guardType,
            allowedUsers: request.allowedUsers || [],
            allowedRoles: request.allowedRoles || [],
            isActive: request.isActive !== false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          guards.set(newGuard.id, newGuard);
          return newGuard;
        }),
        updateGuard: jest.fn((id: string, updates: any) => {
          const existing = guards.get(id);
          if (!existing) {
            throw new Error(`Tool usage guard with ID ${id} not found`);
          }
          const updated = {
            ...existing,
            ...updates,
            updatedAt: new Date().toISOString(),
          };
          guards.set(id, updated);
          return updated;
        }),
        deleteGuard: jest.fn((id: string) => {
          const existed = guards.has(id);
          guards.delete(id);
          return existed;
        }),
        toggleGuard: jest.fn((id: string, isActive: boolean) => {
          const existing = guards.get(id);
          if (!existing) {
            throw new Error(`Tool usage guard with ID ${id} not found`);
          }
          const updated = {
            ...existing,
            isActive,
            updatedAt: new Date().toISOString(),
          };
          guards.set(id, updated);
          return updated;
        }),
      };
    }),
  },
}));

const app = express();
app.use(express.json());
app.use('/api/admin', adminRoutes);

describe('Admin Routes', () => {
  const originalEnv = process.env;

  beforeAll(() => {
    process.env = { ...originalEnv };
    process.env.ALLOW_LOCAL_NETWORK_ACCESS = 'true';
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    const { webUIStorage } = require('../../src/storage/webUIStorage');
    webUIStorage._llmProviders = [
      { id: 'llm1', name: 'LLM 1', type: 'openai', config: {}, isActive: true },
    ];
    webUIStorage._messengerProviders = [
      { id: 'msg1', name: 'Messenger 1', type: 'discord', config: {}, isActive: true },
    ];
  });

  describe('LLM Providers', () => {
    test('GET /api/admin/llm-providers should return providers list', async () => {
      const response = await request(app).get('/api/admin/llm-providers').expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.providers)).toBe(true);
    });

    test('POST /api/admin/llm-providers should create new provider', async () => {
      const providerData = {
        name: 'Test Provider',
        type: 'openai',
        config: {
          apiKey: 'sk-test123',
          model: 'gpt-4',
          baseUrl: 'https://api.openai.com/v1',
        },
      };

      const response = await request(app)
        .post('/api/admin/llm-providers')
        .send(providerData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.provider.name).toBe('Test Provider');
      expect(response.body.data.provider.type).toBe('openai');
      expect(response.body.data.provider.config.apiKey).toBe('sk-***'); // Should be sanitized
    });

    test('POST /api/admin/llm-providers should validate required fields', async () => {
      const invalidData = {
        name: 'Test Provider',
        // Missing type and config
      };

      const response = await request(app)
        .post('/api/admin/llm-providers')
        .send(invalidData)
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
      expect(Array.isArray(response.body.issues)).toBe(true);
      expect(response.body.issues.length).toBeGreaterThan(0);
    });

    test('PUT /api/admin/llm-providers/:id should update provider', async () => {
      const updateData = {
        name: 'Updated Provider',
        type: 'openai',
        config: {
          apiKey: 'sk-updated123',
          model: 'gpt-4',
          baseUrl: 'https://api.openai.com/v1',
        },
      };

      const response = await request(app)
        .put('/api/admin/llm-providers/llm1')
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.provider.name).toBe('Updated Provider');
    });

    test('DELETE /api/admin/llm-providers/:id should delete provider', async () => {
      const response = await request(app).delete('/api/admin/llm-providers/llm1').expect(200);

      expect(response.body.success).toBe(true);
    });

    test('POST /api/admin/llm-providers/:id/toggle should toggle status', async () => {
      const response = await request(app)
        .post('/api/admin/llm-providers/llm1/toggle')
        .send({ isActive: false })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Messenger Providers', () => {
    test('GET /api/admin/messenger-providers should return providers list', async () => {
      const response = await request(app).get('/api/admin/messenger-providers').expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.providers)).toBe(true);
    });

    test('POST /api/admin/messenger-providers should create new provider', async () => {
      const providerData = {
        name: 'Test Discord Bot',
        type: 'discord',
        config: {
          token: 'discord-token-123',
          clientId: 'client-id-123',
          guildId: 'guild-id-123',
        },
      };

      const response = await request(app)
        .post('/api/admin/messenger-providers')
        .send(providerData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.provider.name).toBe('Test Discord Bot');
      expect(response.body.data.provider.config.token).toBe('dis***'); // Should be sanitized
    });

    test('POST /api/admin/messenger-providers should validate required fields', async () => {
      const invalidData = {
        name: 'Test Provider',
        // Missing type and config
      };

      const response = await request(app)
        .post('/api/admin/messenger-providers')
        .send(invalidData)
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
      expect(Array.isArray(response.body.issues)).toBe(true);
      expect(response.body.issues.length).toBeGreaterThan(0);
    });
  });

  describe('Personas', () => {
    test('GET /api/admin/personas should return personas list', async () => {
      const response = await request(app).get('/api/admin/personas').expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.personas)).toBe(true);
      expect(Array.isArray(response.body.data.personas)).toBe(true);
    });

    test('POST /api/admin/personas should create new persona', async () => {
      const personaData = {
        key: 'test_persona',
        name: 'Test Persona',
        systemPrompt: 'You are a helpful test assistant.',
      };

      const response = await request(app).post('/api/admin/personas').send(personaData).expect(200);

      expect(response.body.success).toBe(true);
    });

    test('POST /api/admin/personas should validate key format', async () => {
      const invalidData = {
        key: 'invalid key with spaces',
        name: 'Test Persona',
        systemPrompt: 'You are a helpful test assistant.',
      };

      const response = await request(app).post('/api/admin/personas').send(invalidData).expect(400);

      expect(response.body.error).toBe('Validation failed');
      expect(Array.isArray(response.body.issues)).toBe(true);
      expect(response.body.issues.length).toBeGreaterThan(0);
    });

    test('PUT /api/admin/personas/:key should update persona', async () => {
      const updateData = {
        name: 'Updated Persona',
        systemPrompt: 'You are an updated test assistant.',
      };

      const response = await request(app)
        .put('/api/admin/personas/test_persona')
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('DELETE /api/admin/personas/:key should delete persona', async () => {
      const response = await request(app).delete('/api/admin/personas/test_persona').expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('MCP Servers', () => {
    test('GET /api/admin/mcp-servers should return servers list', async () => {
      const response = await request(app).get('/api/admin/mcp-servers').expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.servers)).toBe(true);
      expect(Array.isArray(response.body.data.configurations)).toBe(true);
    });

    test('POST /api/admin/mcp-servers/connect should connect to server', async () => {
      const connectData = {
        name: 'Test Server',
        serverUrl: 'http://localhost:3000',
        apiKey: 'test-api-key',
      };

      const response = await request(app)
        .post('/api/admin/mcp-servers/connect')
        .send(connectData)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('POST /api/admin/mcp-servers/connect should validate URL format', async () => {
      const invalidData = {
        name: 'Test Server',
        serverUrl: 'invalid-url',
      };

      const response = await request(app)
        .post('/api/admin/mcp-servers/connect')
        .send(invalidData)
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
      expect(Array.isArray(response.body.issues)).toBe(true);
      expect(response.body.issues.length).toBeGreaterThan(0);
    });

    test('POST /api/admin/mcp-servers/disconnect should disconnect from server', async () => {
      const disconnectData = {
        name: 'Test Server',
      };

      const response = await request(app)
        .post('/api/admin/mcp-servers/disconnect')
        .send(disconnectData)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Tool Usage Guards', () => {
    test('GET /api/admin/tool-usage-guards should return guards list', async () => {
      const response = await request(app).get('/api/admin/tool-usage-guards').expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.guards)).toBe(true);
      expect(Array.isArray(response.body.data.guards)).toBe(true);
    });

    test('POST /api/admin/tool-usage-guards should create new guard', async () => {
      const guardData = {
        name: 'Test Guard',
        description: 'Test description',
        toolId: 'test_tool',
        guardType: 'owner_only',
        isActive: true,
      };

      const response = await request(app)
        .post('/api/admin/tool-usage-guards')
        .send(guardData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.guard.name).toBe('Test Guard');
      expect(response.body.data.guard.guardType).toBe('owner_only');
    });

    test('POST /api/admin/tool-usage-guards should validate guard type', async () => {
      const invalidData = {
        name: 'Test Guard',
        toolId: 'test_tool',
        guardType: 'invalid_type',
      };

      const response = await request(app)
        .post('/api/admin/tool-usage-guards')
        .send(invalidData)
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
      expect(Array.isArray(response.body.issues)).toBe(true);
      expect(response.body.issues.length).toBeGreaterThan(0);
    });

    test('PUT /api/admin/tool-usage-guards/:id should update guard', async () => {
      const updateData = {
        name: 'Updated Guard',
        description: 'Updated description',
        toolId: 'test_tool',
        guardType: 'user_list',
        allowedUsers: ['user1', 'user2'],
        isActive: false,
      };

      const response = await request(app)
        .put('/api/admin/tool-usage-guards/guard1')
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.guard.name).toBe('Updated Guard');
      expect(response.body.data.guard.guardType).toBe('user_list');
    });

    test('DELETE /api/admin/tool-usage-guards/:id should delete guard', async () => {
      const response = await request(app).delete('/api/admin/tool-usage-guards/guard1').expect(200);

      expect(response.body.success).toBe(true);
    });

    test('POST /api/admin/tool-usage-guards/:id/toggle should toggle guard status', async () => {
      const response = await request(app)
        .post('/api/admin/tool-usage-guards/guard1/toggle')
        .send({ isActive: false })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Environment Overrides', () => {
    test('GET /api/admin/env-overrides should return environment variables', async () => {
      const response = await request(app).get('/api/admin/env-overrides').expect(200);

      expect(response.body.success).toBe(true);
      expect(typeof response.body.data.envVars).toBe('object');
    });
  });
});
