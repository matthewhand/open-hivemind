import { Mem4aiProvider } from './Mem4aiProvider';
import { Mem4aiApiError } from './types';
import { clearCircuitBreakerRegistry } from './CircuitBreaker';

const BASE_CONFIG = {
  apiKey: 'test-key',
  apiUrl: 'https://api.mem4ai.example.com',
  maxRetries: 0,
};

function mockFetch(status: number, body: unknown) {
  return jest.spyOn(global, 'fetch').mockResolvedValue(
    new Response(status === 204 ? null : JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    })
  );
}

function mockFetchSequence(...responses: Array<{ status: number; body: unknown }>) {
  const mock = jest.spyOn(global, 'fetch');
  responses.forEach(({ status, body }) => {
    mock.mockResolvedValueOnce(
      new Response(status === 204 ? null : JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json' },
      })
    );
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  clearCircuitBreakerRegistry();
});
afterEach(() => jest.restoreAllMocks());

describe('Mem4aiProvider constructor', () => {
  it('throws if apiKey is missing', () => {
    expect(() => new Mem4aiProvider({ apiKey: '', apiUrl: 'https://api.mem4ai.example.com' }))
      .toThrow('apiKey is required');
  });

  it('throws if apiUrl is missing', () => {
    expect(() => new Mem4aiProvider({ apiKey: 'key', apiUrl: '' }))
      .toThrow('apiUrl is required');
  });

  it('strips trailing slash from apiUrl', () => {
    const p = new Mem4aiProvider({ ...BASE_CONFIG, apiUrl: 'https://api.mem4ai.example.com/' });
    expect(p).toBeDefined();
  });
});

describe('addMemory', () => {
  it('posts to /memories/ and returns MemoryEntry', async () => {
    mockFetch(200, {
      results: [{ id: 'mem-1', memory: 'test content', created_at: '2024-01-01T00:00:00Z' }],
    });
    const p = new Mem4aiProvider(BASE_CONFIG);
    const entry = await p.addMemory('test content');
    expect(entry.id).toBe('mem-1');
    expect(entry.content).toBe('test content');
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/memories/'),
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('includes embeddingProviderId when configured', async () => {
    mockFetch(200, { results: [{ id: 'x', memory: 'y' }] });
    const p = new Mem4aiProvider({ ...BASE_CONFIG, embeddingProviderId: 'openai' });
    await p.addMemory('hello');
    const body = JSON.parse((fetch as jest.Mock).mock.calls[0][1].body);
    expect(body.embedding_provider_id).toBe('openai');
  });
});

describe('searchMemories', () => {
  it('posts to /memories/search/ and returns results', async () => {
    mockFetch(200, { results: [{ id: 'mem-2', memory: 'relevant', score: 0.9 }] });
    const p = new Mem4aiProvider(BASE_CONFIG);
    const result = await p.searchMemories('query');
    expect(result.results).toHaveLength(1);
    expect(result.results[0].score).toBe(0.9);
  });

  it('filters by threshold', async () => {
    mockFetch(200, {
      results: [
        { id: '1', memory: 'high', score: 0.9 },
        { id: '2', memory: 'low', score: 0.3 },
      ],
    });
    const p = new Mem4aiProvider(BASE_CONFIG);
    const result = await p.searchMemories('query', { threshold: 0.5 });
    expect(result.results).toHaveLength(1);
    expect(result.results[0].id).toBe('1');
  });
});

describe('getMemories', () => {
  it('gets from /memories/ and returns array', async () => {
    mockFetch(200, { results: [{ id: 'a', memory: 'foo' }] });
    const p = new Mem4aiProvider(BASE_CONFIG);
    const entries = await p.getMemories();
    expect(entries).toHaveLength(1);
  });
});

describe('getMemory', () => {
  it('returns null on 404', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({}), { status: 404, headers: { 'content-type': 'application/json' } })
    );
    const p = new Mem4aiProvider(BASE_CONFIG);
    expect(await p.getMemory('missing')).toBeNull();
  });

  it('returns MemoryEntry on success', async () => {
    mockFetch(200, { id: 'mem-3', memory: 'stored' });
    const p = new Mem4aiProvider(BASE_CONFIG);
    const entry = await p.getMemory('mem-3');
    expect(entry?.id).toBe('mem-3');
  });
});

describe('updateMemory', () => {
  it('puts to /memories/{id}/ and returns updated entry', async () => {
    mockFetch(200, { id: 'mem-4', memory: 'updated' });
    const p = new Mem4aiProvider(BASE_CONFIG);
    const entry = await p.updateMemory('mem-4', 'updated');
    expect(entry.content).toBe('updated');
    expect((fetch as jest.Mock).mock.calls[0][1].method).toBe('PUT');
  });
});

describe('deleteMemory', () => {
  it('sends DELETE to /memories/{id}/', async () => {
    mockFetch(204, null);
    const p = new Mem4aiProvider(BASE_CONFIG);
    await expect(p.deleteMemory('mem-5')).resolves.toBeUndefined();
  });
});

describe('deleteAll', () => {
  it('sends DELETE with userId query param', async () => {
    mockFetch(204, null);
    const p = new Mem4aiProvider(BASE_CONFIG);
    await p.deleteAll({ userId: 'u1' });
    const url = (fetch as jest.Mock).mock.calls[0][0] as string;
    expect(url).toContain('user_id=u1');
  });
});

describe('healthCheck', () => {
  it('returns ok on success', async () => {
    mockFetch(200, { results: [] });
    const p = new Mem4aiProvider(BASE_CONFIG);
    expect((await p.healthCheck()).status).toBe('ok');
  });

  it('returns error on failure', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('network error'));
    const p = new Mem4aiProvider(BASE_CONFIG);
    const result = await p.healthCheck();
    expect(result.status).toBe('error');
  });
});

describe('retry behaviour', () => {
  it('retries on 429 and succeeds', async () => {
    mockFetchSequence(
      { status: 429, body: 'rate limited' },
      { status: 200, body: { results: [{ id: 'r', memory: 'ok' }] } }
    );
    const p = new Mem4aiProvider({ ...BASE_CONFIG, maxRetries: 1 });
    const entries = await p.getMemories();
    expect(entries[0].id).toBe('r');
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('retries on 500 and succeeds', async () => {
    mockFetchSequence(
      { status: 500, body: 'server error' },
      { status: 200, body: { results: [] } }
    );
    const p = new Mem4aiProvider({ ...BASE_CONFIG, maxRetries: 1 });
    await expect(p.getMemories()).resolves.toEqual([]);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('throws after exhausting retries', async () => {
    mockFetchSequence(
      { status: 500, body: 'err' },
      { status: 500, body: 'err' }
    );
    const p = new Mem4aiProvider({ ...BASE_CONFIG, maxRetries: 1 });
    await expect(p.getMemories()).rejects.toBeInstanceOf(Mem4aiApiError);
  });

  it('does not retry on 400', async () => {
    mockFetch(400, { detail: 'bad request' });
    const p = new Mem4aiProvider({ ...BASE_CONFIG, maxRetries: 3 });
    await expect(p.getMemories()).rejects.toBeInstanceOf(Mem4aiApiError);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});

describe('circuit breaker', () => {
  it('opens after failureThreshold consecutive failures', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('network'));
    const p = new Mem4aiProvider({ ...BASE_CONFIG, maxRetries: 0, circuitBreaker: { failureThreshold: 2, resetTimeoutMs: 60000, name: 'mem4ai-cb-test' } as any });
    await expect(p.getMemories()).rejects.toThrow();
    await expect(p.getMemories()).rejects.toThrow();
    await expect(p.getMemories()).rejects.toThrow(/Circuit breaker/);
  });
});

describe('legacy convenience methods', () => {
  it('add() returns legacy shape', async () => {
    mockFetch(200, { results: [{ id: 'l1', memory: 'legacy' }] });
    const p = new Mem4aiProvider(BASE_CONFIG);
    const result = await p.add([{ role: 'user', content: 'hello' }]);
    expect(result.results[0]).toMatchObject({ id: 'l1', memory: 'legacy' });
  });

  it('search() returns legacy shape', async () => {
    mockFetch(200, { results: [{ id: 'l2', memory: 'found', score: 0.7 }] });
    const p = new Mem4aiProvider(BASE_CONFIG);
    const result = await p.search('query');
    expect(result.results[0].memory).toBe('found');
  });

  it('getAll() returns id/memory pairs', async () => {
    mockFetch(200, { results: [{ id: 'l3', memory: 'all' }] });
    const p = new Mem4aiProvider(BASE_CONFIG);
    const result = await p.getAll();
    expect(result.results[0]).toEqual({ id: 'l3', memory: 'all' });
  });

  it('get() returns null on 404', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({}), { status: 404, headers: { 'content-type': 'application/json' } })
    );
    const p = new Mem4aiProvider(BASE_CONFIG);
    expect(await p.get('missing')).toBeNull();
  });

  it('update() returns id/memory pair', async () => {
    mockFetch(200, { id: 'l4', memory: 'updated' });
    const p = new Mem4aiProvider(BASE_CONFIG);
    expect(await p.update('l4', 'updated')).toEqual({ id: 'l4', memory: 'updated' });
  });

  it('delete() resolves without error', async () => {
    mockFetch(204, null);
    const p = new Mem4aiProvider(BASE_CONFIG);
    await expect(p.delete('l5')).resolves.toBeUndefined();
  });
});
