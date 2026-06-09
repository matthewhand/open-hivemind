/**
 * Tests for POST /api/providers/memory/:name/test — the memory provider
 * smoke test. It exercises add → search → get → update → delete; the
 * updateMemory step must:
 *   - pass when the provider supports updates,
 *   - be skipped with 'unsupported' when the provider lacks updateMemory,
 *   - report a failure (without aborting the run) when the update throws.
 */

import express from 'express';
import request from 'supertest';
import { providerRegistry } from '@src/registries/ProviderRegistry';
import providersRouter from '@src/server/routes/providers';
import type { IMemoryProvider } from '@src/types/IProvider';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/', providersRouter);
  return app;
}

function makeFakeProvider(overrides: Partial<IMemoryProvider> = {}): IMemoryProvider {
  const entry = {
    id: 'mem-1',
    content: 'Smoke test: my favourite colour is blue.',
    metadata: {},
    createdAt: new Date().toISOString(),
  };
  return {
    addMemory: jest.fn().mockResolvedValue(entry),
    searchMemories: jest.fn().mockResolvedValue({ results: [entry] }),
    getMemories: jest.fn().mockResolvedValue([entry]),
    getMemory: jest.fn().mockResolvedValue(entry),
    updateMemory: jest.fn().mockResolvedValue({
      ...entry,
      content: 'Smoke test (updated): my favourite colour is green.',
    }),
    deleteMemory: jest.fn().mockResolvedValue(undefined),
    deleteAll: jest.fn().mockResolvedValue(undefined),
    healthCheck: jest.fn().mockResolvedValue({ status: 'ok' }),
    ...overrides,
  } as unknown as IMemoryProvider;
}

function getStep(body: any, name: string) {
  return body.data.steps.find((s: any) => s.step === name);
}

describe('POST /memory/:name/test', () => {
  afterEach(() => {
    providerRegistry.removeMemoryProvider('fake');
    jest.restoreAllMocks();
  });

  it('runs the full add → search → get → update → delete pipeline', async () => {
    const provider = makeFakeProvider();
    providerRegistry.registerMemoryProvider('fake', provider);

    const res = await request(buildApp()).post('/memory/fake/test').send({});

    expect(res.status).toBe(200);
    const stepNames = res.body.data.steps.map((s: any) => s.step);
    expect(stepNames).toEqual([
      'healthCheck',
      'addMemory',
      'searchMemories',
      'getMemory',
      'updateMemory',
      'deleteMemory',
    ]);
    expect(res.body.data.summary).toMatchObject({ passed: 6, failed: 0, skipped: 0 });

    expect(provider.updateMemory).toHaveBeenCalledWith(
      'mem-1',
      expect.stringContaining('updated'),
      expect.objectContaining({ source: 'smoke-test' })
    );
    expect(getStep(res.body, 'updateMemory')).toMatchObject({
      status: 'pass',
      detail: expect.objectContaining({ id: 'mem-1' }),
    });
    // Delete still runs after the update step.
    expect(provider.deleteMemory).toHaveBeenCalledWith('mem-1');
  });

  it("skips updateMemory with 'unsupported' when the provider lacks it", async () => {
    const provider = makeFakeProvider({ updateMemory: undefined });
    providerRegistry.registerMemoryProvider('fake', provider);

    const res = await request(buildApp()).post('/memory/fake/test').send({});

    expect(res.status).toBe(200);
    expect(getStep(res.body, 'updateMemory')).toMatchObject({
      status: 'skip',
      detail: 'unsupported',
    });
    expect(res.body.data.summary).toMatchObject({ passed: 5, failed: 0, skipped: 1 });
    // Cleanup still happens.
    expect(provider.deleteMemory).toHaveBeenCalledWith('mem-1');
  });

  it('reports an updateMemory failure without aborting the run', async () => {
    const provider = makeFakeProvider({
      updateMemory: jest.fn().mockRejectedValue(new Error('update exploded')),
    });
    providerRegistry.registerMemoryProvider('fake', provider);

    const res = await request(buildApp()).post('/memory/fake/test').send({});

    expect(res.status).toBe(200);
    expect(getStep(res.body, 'updateMemory')).toMatchObject({
      status: 'fail',
      detail: 'update exploded',
    });
    expect(res.body.data.summary.failed).toBe(1);
    expect(provider.deleteMemory).toHaveBeenCalledWith('mem-1');
  });

  it('skips updateMemory when the add step produced no memoryId', async () => {
    const provider = makeFakeProvider({
      addMemory: jest.fn().mockResolvedValue(undefined),
    });
    providerRegistry.registerMemoryProvider('fake', provider);

    const res = await request(buildApp()).post('/memory/fake/test').send({});

    expect(res.status).toBe(200);
    expect(getStep(res.body, 'updateMemory')).toMatchObject({
      status: 'skip',
      detail: 'no memoryId from add step',
    });
    expect(provider.updateMemory).not.toHaveBeenCalled();
  });
});
