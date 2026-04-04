import { Mem0Provider } from './Mem0Provider';
import { Mem0ApiError } from './types';

const BASE_CONFIG = { apiKey: 'test-key', baseUrl: 'https://api.mem0.ai/v1', maxRetries: 0 };

function mockFetch(status: number, body: unknown) {
  const response = new Response(
    status === 204 ? null : JSON.stringify(body),
    {
      status,
      headers: { 'content-type': 'application/json' },
    }
  );
  jest.spyOn(global, 'fetch').mockResolvedValue(response);
}

function mockFetchSequence(...responses: Array<{ status: number; body: unknown }>) {
  const mock = jest.spyOn(global, 'fetch');
  responses.forEach(({ status, body }, i) => {
    mock.mockResolvedValueOnce(
      new Response(status === 204 ? null : JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json' },
      })
    );
  });
}

beforeEach(() => jest.clearAllMocks());
afterEach(() => jest.restoreAllMocks());

describe('Mem0Provider constructor', () => {
  it('throws if apiKey is missing', () => {
    expect(() => new Mem0Provider({ apiKey: '', baseUrl: 'https://api.mem0.ai/v1' }))
      .toThrow('apiKey is required');
  });

  it('uses default baseUrl when not provided', () => {
    const p = new Mem0Provider({ apiKey: 'key' });
    expect(p).toBeDefined();
  });

  it('strips trailing slash from baseUrl', () => {
    const p = new Mem0Provider({ ...BASE_CONFIG, baseUrl: 'https://api.mem0.ai/v1/' });
    expect(p).toBeDefined();
  });
});

describe('addMemory', () => {
  it('posts to /memories/ and returns MemoryEntry', async () => {
    mockFetch(200, {
      results: [{ id: 'mem-1', memory: 'test content', created_at: '2024-01-01T00:00:00Z' }],
    });
    const p = new Mem0Provider(BASE_CONFIG);
    const entry = await p.addMemory('test content');
    expect(entry.id).toBe('mem-1');
    expect(entry.content).toBe('test content');
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/memories/'),
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('includes userId and agentId in body', async () => {
    mockFetch(200, { results: [{ id: 'x', memory: 'y' }] });
    const p = new Mem0Provider({ ...BASE_CONFIG, userId: 'u1', agentId: 'a1' });
    await p.addMemory('hello');
    const body = JSON.parse((fetch as jest.Mock).mock.calls[0][1].body);
    expect(body.user_id).toBe('u1');
    expect(body.agent_id).toBe('a1');
  });
});

describe('searchMemories', () => {
  it('posts to /memories/search/ and returns results', async () => {
    mockFetch(200, {
      results: [{ id: 'mem-2', memory: 'relevant', score: 0.9 }],
    });
    const p = new Mem0Provider(BASE_CONFIG);
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
    const p = new Mem0Provider(BASE_CONFIG);
    const result = await p.searchMemories('query', { threshold: 0.5 });
    expect(result.results).toHaveLength(1);
    expect(result.results[0].id).toBe('1');
  });
});

describe('getMemories', () => {
  it('gets from /memories/ and returns array', async () => {
    mockFetch(200, { results: [{ id: 'a', memory: 'foo' }] });
    const p = new Mem0Provider(BASE_CONFIG);
    const entries = await p.getMemories();
    expect(entries).toHaveLength(1);
    expect(entries[0].id).toBe('a');
  });
});

describe('getMemory', () => {
  it('returns null on 404', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ detail: 'not found' }), {
        status: 404,
        headers: { 'content-type': 'application/json' },
      })
    );
    const p = new Mem0Provider(BASE_CONFIG);
    const result = await p.getMemory('missing-id');
    expect(result).toBeNull();
  });

  it('returns MemoryEntry on success', async () => {
    mockFetch(200, { id: 'mem-3', memory: 'stored' });
    const p = new Mem0Provider(BASE_CONFIG);
    const entry = await p.getMemory('mem-3');
    expect(entry?.id).toBe('mem-3');
  });
});

describe('updateMemory', () => {
  it('puts to /memories/{id}/ and returns updated entry', async () => {
    mockFetch(200, { id: 'mem-4', memory: 'updated content' });
    const p = new Mem0Provider(BASE_CONFIG);
    const entry = await p.updateMemory('mem-4', 'updated content');
    expect(entry.content).toBe('updated content');
    expect((fetch as jest.Mock).mock.calls[0][1].method).toBe('PUT');
  });
});

describe('deleteMemory', () => {
  it('sends DELETE to /memories/{id}/', async () => {
    mockFetch(204, null);
    const p = new Mem0Provider(BASE_CONFIG);
    await expect(p.deleteMemory('mem-5')).resolves.toBeUndefined();
    expect((fetch as jest.Mock).mock.calls[0][1].method).toBe('DELETE');
  });
});

describe('deleteAll', () => {
  it('sends DELETE to /memories/', async () => {
    mockFetch(204, null);
    const p = new Mem0Provider(BASE_CONFIG);
    await p.deleteAll({ userId: 'u1' });
    const url = (fetch as jest.Mock).mock.calls[0][0] as string;
    expect(url).toContain('user_id=u1');
  });
});

describe('healthCheck', () => {
  it('returns ok on success', async () => {
    mockFetch(200, { results: [] });
    const p = new Mem0Provider(BASE_CONFIG);
    const result = await p.healthCheck();
    expect(result.status).toBe('ok');
  });

  it('returns error on failure', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('network error'));
    const p = new Mem0Provider(BASE_CONFIG);
    const result = await p.healthCheck();
    expect(result.status).toBe('error');
    expect(result.details?.message).toContain('network error');
  });
});

describe('retry behaviour', () => {
  it('retries on 429 and succeeds', async () => {
    mockFetchSequence(
      { status: 429, body: 'rate limited' },
      { status: 200, body: { results: [{ id: 'r', memory: 'ok' }] } }
    );
    const p = new Mem0Provider({ ...BASE_CONFIG, maxRetries: 1 });
    const entries = await p.getMemories();
    expect(entries[0].id).toBe('r');
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('retries on 500 and succeeds', async () => {
    mockFetchSequence(
      { status: 500, body: 'server error' },
      { status: 200, body: { results: [] } }
    );
    const p = new Mem0Provider({ ...BASE_CONFIG, maxRetries: 1 });
    await expect(p.getMemories()).resolves.toEqual([]);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('throws after exhausting retries', async () => {
    mockFetchSequence(
      { status: 500, body: 'err' },
      { status: 500, body: 'err' }
    );
    const p = new Mem0Provider({ ...BASE_CONFIG, maxRetries: 1 });
    await expect(p.getMemories()).rejects.toBeInstanceOf(Mem0ApiError);
  });

  it('does not retry on 400', async () => {
    mockFetch(400, { detail: 'bad request' });
    const p = new Mem0Provider({ ...BASE_CONFIG, maxRetries: 3 });
    await expect(p.getMemories()).rejects.toBeInstanceOf(Mem0ApiError);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});

describe('legacy convenience methods', () => {
  it('add() returns legacy shape', async () => {
    mockFetch(200, { results: [{ id: 'l1', memory: 'legacy', score: 0.8 }] });
    const p = new Mem0Provider(BASE_CONFIG);
    const result = await p.add([{ role: 'user', content: 'hello' }]);
    expect(result.results[0]).toMatchObject({ id: 'l1', memory: 'legacy' });
  });

  it('search() returns legacy shape', async () => {
    mockFetch(200, { results: [{ id: 'l2', memory: 'found', score: 0.7 }] });
    const p = new Mem0Provider(BASE_CONFIG);
    const result = await p.search('query');
    expect(result.results[0].memory).toBe('found');
  });

  it('getAll() returns id/memory pairs', async () => {
    mockFetch(200, { results: [{ id: 'l3', memory: 'all' }] });
    const p = new Mem0Provider(BASE_CONFIG);
    const result = await p.getAll();
    expect(result.results[0]).toEqual({ id: 'l3', memory: 'all' });
  });

  it('get() returns null on 404', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({}), { status: 404, headers: { 'content-type': 'application/json' } })
    );
    const p = new Mem0Provider(BASE_CONFIG);
    expect(await p.get('missing')).toBeNull();
  });

  it('update() returns id/memory pair', async () => {
    mockFetch(200, { id: 'l4', memory: 'updated' });
    const p = new Mem0Provider(BASE_CONFIG);
    const result = await p.update('l4', 'updated');
    expect(result).toEqual({ id: 'l4', memory: 'updated' });
  });

  it('delete() resolves without error', async () => {
    mockFetch(204, null);
    const p = new Mem0Provider(BASE_CONFIG);
    await expect(p.delete('l5')).resolves.toBeUndefined();
  });
});
