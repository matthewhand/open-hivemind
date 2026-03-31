import express from 'express';
import request from 'supertest';
import { providerRegistry } from '../../src/registries/ProviderRegistry';
import providersRouter from '../../src/server/routes/providers';

// Mock the provider registry
jest.mock('../../src/registries/ProviderRegistry', () => ({
  providerRegistry: {
    getMemoryProviders: jest.fn(),
    getToolProviders: jest.fn(),
  },
}));

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/providers', providersRouter);
  return app;
}

describe('GET /api/providers/memory', () => {
  it('returns empty list when no providers registered', async () => {
    (providerRegistry.getMemoryProviders as jest.Mock).mockReturnValue(new Map());

    const app = createApp();
    const res = await request(app).get('/api/providers/memory');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: { count: 0, providers: [] } });
  });

  it('returns providers with health status', async () => {
    const mockProvider = {
      id: 'mem0',
      label: 'Mem0',
      healthCheck: jest.fn().mockResolvedValue({ status: 'ok' }),
    };

    (providerRegistry.getMemoryProviders as jest.Mock).mockReturnValue(
      new Map([['local-mem0', mockProvider]])
    );

    const app = createApp();
    const res = await request(app).get('/api/providers/memory');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.count).toBe(1);
    expect(res.body.data.providers[0]).toMatchObject({
      name: 'local-mem0',
      id: 'mem0',
      label: 'Mem0',
      status: 'ok',
    });
    expect(mockProvider.healthCheck).toHaveBeenCalled();
  });

  it('reports error status when healthCheck fails', async () => {
    const mockProvider = {
      id: 'mem0',
      label: 'Mem0',
      healthCheck: jest.fn().mockRejectedValue(new Error('Connection refused')),
    };

    (providerRegistry.getMemoryProviders as jest.Mock).mockReturnValue(
      new Map([['broken', mockProvider]])
    );

    const app = createApp();
    const res = await request(app).get('/api/providers/memory');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.providers[0].status).toBe('error');
    expect(res.body.data.providers[0].details).toMatchObject({ message: 'Connection refused' });
  });
});

describe('POST /api/providers/memory/:name/test', () => {
  it('returns 404 for unknown provider', async () => {
    (providerRegistry.getMemoryProviders as jest.Mock).mockReturnValue(new Map());

    const app = createApp();
    const res = await request(app).post('/api/providers/memory/nonexistent/test');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('not found');
  });

  it('runs full CRUD smoke test on a provider', async () => {
    const mockProvider = {
      id: 'mem0',
      label: 'Mem0',
      healthCheck: jest.fn().mockResolvedValue({ status: 'ok' }),
      addMemory: jest.fn().mockResolvedValue({ id: 'mem-123', content: 'blue' }),
      searchMemories: jest
        .fn()
        .mockResolvedValue({ results: [{ id: 'mem-123', memory: 'blue', score: 0.9 }] }),
      getMemory: jest.fn().mockResolvedValue({ id: 'mem-123', content: 'blue' }),
      deleteMemory: jest.fn().mockResolvedValue(undefined),
    };

    (providerRegistry.getMemoryProviders as jest.Mock).mockReturnValue(
      new Map([['local-mem0', mockProvider]])
    );

    const app = createApp();
    const res = await request(app)
      .post('/api/providers/memory/local-mem0/test')
      .send({ userId: 'test-user' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.provider).toBe('local-mem0');
    expect(res.body.data.summary.passed).toBe(5);
    expect(res.body.data.summary.failed).toBe(0);
    expect(res.body.data.steps).toHaveLength(5);
    expect(res.body.data.steps.map((s: any) => s.step)).toEqual([
      'healthCheck',
      'addMemory',
      'searchMemories',
      'getMemory',
      'deleteMemory',
    ]);
    expect(res.body.data.steps.every((s: any) => s.status === 'pass')).toBe(true);
  });

  it('reports partial failures gracefully', async () => {
    const mockProvider = {
      id: 'mem0',
      label: 'Mem0',
      healthCheck: jest.fn().mockResolvedValue({ status: 'ok' }),
      addMemory: jest.fn().mockRejectedValue(new Error('LLM API key invalid')),
      searchMemories: jest.fn().mockRejectedValue(new Error('LLM API key invalid')),
      getMemory: jest.fn(),
      deleteMemory: jest.fn(),
    };

    (providerRegistry.getMemoryProviders as jest.Mock).mockReturnValue(
      new Map([['broken-key', mockProvider]])
    );

    const app = createApp();
    const res = await request(app).post('/api/providers/memory/broken-key/test');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.summary.passed).toBe(1); // healthCheck passes
    expect(res.body.data.summary.failed).toBe(2); // add + search fail
    expect(res.body.data.summary.skipped).toBe(2); // get + delete skipped (no memoryId)
    expect(res.body.data.steps[1].detail).toContain('LLM API key invalid');
  });
});

describe('GET /api/providers/tool', () => {
  it('returns tool providers with health status', async () => {
    const mockProvider = {
      id: 'mcp',
      label: 'MCP Tools',
      healthCheck: jest.fn().mockResolvedValue({ status: 'ok' }),
    };

    (providerRegistry.getToolProviders as jest.Mock).mockReturnValue(
      new Map([['default-mcp', mockProvider]])
    );

    const app = createApp();
    const res = await request(app).get('/api/providers/tool');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.count).toBe(1);
    expect(res.body.data.providers[0].status).toBe('active');
  });
});
