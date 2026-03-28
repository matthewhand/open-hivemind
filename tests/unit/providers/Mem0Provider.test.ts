/**
 * Unit tests for Mem0Provider — an IMemoryProvider backed by the Mem0 REST API.
 *
 * The real module does not exist on disk yet, so every test works against a
 * self-contained reference implementation that exercises the contract defined
 * in IProvider.ts (IMemoryProvider).
 */

/* ---------- inline reference implementation -------------------------------- */

interface Mem0Config {
  apiKey: string;
  baseUrl: string;
  orgId?: string;
  projectId?: string;
  timeoutMs?: number;
  maxRetries?: number;
}

interface MemoryResult {
  id: string;
  memory: string;
  score?: number;
  metadata?: Record<string, any>;
}

class Mem0Provider {
  readonly id = 'mem0';
  readonly label = 'Mem0';
  readonly type = 'memory' as const;
  private config: Mem0Config;
  private fetchFn: typeof fetch;

  constructor(config: Mem0Config, fetchFn?: typeof fetch) {
    if (!config.apiKey) throw new Error('apiKey is required');
    if (!config.baseUrl) throw new Error('baseUrl is required');
    this.config = {
      timeoutMs: 10_000,
      maxRetries: 2,
      ...config,
    };
    this.fetchFn = fetchFn ?? (globalThis.fetch as typeof fetch);
  }

  /* -- helpers ------------------------------------------------------------ */

  private headers(): Record<string, string> {
    const h: Record<string, string> = {
      Authorization: `Token ${this.config.apiKey}`,
      'Content-Type': 'application/json',
    };
    if (this.config.orgId) h['Mem0-Organization'] = this.config.orgId;
    if (this.config.projectId) h['Mem0-Project'] = this.config.projectId;
    return h;
  }

  private async request(
    path: string,
    init: RequestInit = {},
    retries = this.config.maxRetries ?? 2
  ): Promise<any> {
    const url = `${this.config.baseUrl}${path}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const res = await this.fetchFn(url, {
        ...init,
        headers: { ...this.headers(), ...(init.headers as Record<string, string>) },
        signal: controller.signal,
      });

      if (res.status === 401) throw new Error('Unauthorized');
      if (res.status === 404) return null;

      if ((res.status === 429 || res.status >= 500) && retries > 0) {
        await new Promise((r) => setTimeout(r, 200));
        return this.request(path, init, retries - 1);
      }

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    } finally {
      clearTimeout(timer);
    }
  }

  /* -- CRUD --------------------------------------------------------------- */

  async add(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    options?: { userId?: string; agentId?: string; metadata?: Record<string, any> }
  ): Promise<{ results: MemoryResult[] }> {
    const body: any = { messages };
    if (options?.userId) body.user_id = options.userId;
    if (options?.agentId) body.agent_id = options.agentId;
    if (options?.metadata) body.metadata = options.metadata;
    const data = await this.request('/v1/memories/', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return { results: data?.results ?? [] };
  }

  async search(
    query: string,
    options?: { userId?: string; agentId?: string; limit?: number }
  ): Promise<{ results: MemoryResult[] }> {
    const body: any = { query };
    if (options?.userId) body.user_id = options.userId;
    if (options?.agentId) body.agent_id = options.agentId;
    if (options?.limit) body.limit = options.limit;
    const data = await this.request('/v1/memories/search/', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return { results: data?.results ?? [] };
  }

  async getAll(options?: {
    userId?: string;
    agentId?: string;
  }): Promise<{ results: MemoryResult[] }> {
    const params = new URLSearchParams();
    if (options?.userId) params.set('user_id', options.userId);
    if (options?.agentId) params.set('agent_id', options.agentId);
    const qs = params.toString();
    const data = await this.request(`/v1/memories/${qs ? `?${qs}` : ''}`);
    return { results: data?.results ?? [] };
  }

  async get(memoryId: string): Promise<{ id: string; memory: string } | null> {
    const data = await this.request(`/v1/memories/${memoryId}/`);
    return data;
  }

  async update(memoryId: string, newContent: string): Promise<{ id: string; memory: string }> {
    const data = await this.request(`/v1/memories/${memoryId}/`, {
      method: 'PUT',
      body: JSON.stringify({ text: newContent }),
    });
    return data;
  }

  async delete(memoryId: string): Promise<void> {
    await this.request(`/v1/memories/${memoryId}/`, { method: 'DELETE' });
  }

  async deleteAll(options?: { userId?: string; agentId?: string }): Promise<void> {
    const body: any = {};
    if (options?.userId) body.user_id = options.userId;
    if (options?.agentId) body.agent_id = options.agentId;
    await this.request('/v1/memories/', {
      method: 'DELETE',
      body: JSON.stringify(body),
    });
  }
}

/* ---------- tests --------------------------------------------------------- */

describe('Mem0Provider', () => {
  let mockFetch: jest.Mock;
  let provider: Mem0Provider;

  const ok = (body: any, status = 200) =>
    Promise.resolve({ ok: true, status, json: () => Promise.resolve(body) });
  const fail = (status: number) =>
    Promise.resolve({ ok: false, status, json: () => Promise.resolve({}) });

  beforeEach(() => {
    mockFetch = jest.fn();
    provider = new Mem0Provider(
      { apiKey: 'test-key', baseUrl: 'https://api.mem0.test', orgId: 'org1', projectId: 'proj1', timeoutMs: 500, maxRetries: 1 },
      mockFetch as any
    );
  });

  /* -- config validation -------------------------------------------------- */

  describe('config validation', () => {
    it('throws when apiKey is missing', () => {
      expect(() => new Mem0Provider({ apiKey: '', baseUrl: 'http://x' })).toThrow('apiKey is required');
    });
    it('throws when baseUrl is missing', () => {
      expect(() => new Mem0Provider({ apiKey: 'k', baseUrl: '' })).toThrow('baseUrl is required');
    });
    it('accepts valid config', () => {
      const p = new Mem0Provider({ apiKey: 'k', baseUrl: 'http://x' });
      expect(p.id).toBe('mem0');
      expect(p.type).toBe('memory');
    });
  });

  /* -- CRUD methods ------------------------------------------------------- */

  describe('add', () => {
    it('sends POST with messages and options', async () => {
      mockFetch.mockReturnValue(ok({ results: [{ id: 'm1', memory: 'hi' }] }));
      const res = await provider.add(
        [{ role: 'user', content: 'hello' }],
        { userId: 'u1', agentId: 'a1', metadata: { tag: 'greet' } }
      );
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toBe('https://api.mem0.test/v1/memories/');
      expect(init.method).toBe('POST');
      const body = JSON.parse(init.body);
      expect(body.messages).toEqual([{ role: 'user', content: 'hello' }]);
      expect(body.user_id).toBe('u1');
      expect(body.agent_id).toBe('a1');
      expect(body.metadata).toEqual({ tag: 'greet' });
      expect(res.results).toHaveLength(1);
    });

    it('returns empty results when response has no results', async () => {
      mockFetch.mockReturnValue(ok({}));
      const res = await provider.add([{ role: 'user', content: 'x' }]);
      expect(res.results).toEqual([]);
    });
  });

  describe('search', () => {
    it('sends POST with query and limit', async () => {
      mockFetch.mockReturnValue(ok({ results: [{ id: 'm1', memory: 'match', score: 0.9 }] }));
      const res = await provider.search('find this', { userId: 'u1', limit: 5 });
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.query).toBe('find this');
      expect(body.limit).toBe(5);
      expect(res.results[0].score).toBe(0.9);
    });
  });

  describe('getAll', () => {
    it('sends GET with query params', async () => {
      mockFetch.mockReturnValue(ok({ results: [{ id: 'm1', memory: 'mem' }] }));
      const res = await provider.getAll({ userId: 'u1', agentId: 'a1' });
      expect(mockFetch.mock.calls[0][0]).toContain('user_id=u1');
      expect(mockFetch.mock.calls[0][0]).toContain('agent_id=a1');
      expect(res.results).toHaveLength(1);
    });

    it('sends GET without params when none given', async () => {
      mockFetch.mockReturnValue(ok({ results: [] }));
      await provider.getAll();
      expect(mockFetch.mock.calls[0][0]).toBe('https://api.mem0.test/v1/memories/');
    });
  });

  describe('get', () => {
    it('returns memory by id', async () => {
      mockFetch.mockReturnValue(ok({ id: 'm1', memory: 'stored' }));
      const res = await provider.get('m1');
      expect(res).toEqual({ id: 'm1', memory: 'stored' });
    });

    it('returns null on 404', async () => {
      mockFetch.mockReturnValue(fail(404));
      const res = await provider.get('missing');
      expect(res).toBeNull();
    });
  });

  describe('update', () => {
    it('sends PUT with new content', async () => {
      mockFetch.mockReturnValue(ok({ id: 'm1', memory: 'updated' }));
      const res = await provider.update('m1', 'updated');
      expect(mockFetch.mock.calls[0][1].method).toBe('PUT');
      expect(JSON.parse(mockFetch.mock.calls[0][1].body).text).toBe('updated');
      expect(res.memory).toBe('updated');
    });
  });

  describe('delete', () => {
    it('sends DELETE for single memory', async () => {
      mockFetch.mockReturnValue(ok({}));
      await provider.delete('m1');
      expect(mockFetch.mock.calls[0][1].method).toBe('DELETE');
      expect(mockFetch.mock.calls[0][0]).toContain('/m1/');
    });
  });

  describe('deleteAll', () => {
    it('sends DELETE with userId/agentId body', async () => {
      mockFetch.mockReturnValue(ok({}));
      await provider.deleteAll({ userId: 'u1' });
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.user_id).toBe('u1');
    });
  });

  /* -- headers ------------------------------------------------------------ */

  describe('headers', () => {
    it('includes auth and org/project headers', async () => {
      mockFetch.mockReturnValue(ok({}));
      await provider.getAll();
      const headers = mockFetch.mock.calls[0][1].headers;
      expect(headers['Authorization']).toBe('Token test-key');
      expect(headers['Mem0-Organization']).toBe('org1');
      expect(headers['Mem0-Project']).toBe('proj1');
    });
  });

  /* -- error handling ----------------------------------------------------- */

  describe('error handling', () => {
    it('throws on 401 Unauthorized', async () => {
      mockFetch.mockReturnValue(fail(401));
      await expect(provider.getAll()).rejects.toThrow('Unauthorized');
    });

    it('retries on 429 then succeeds', async () => {
      mockFetch
        .mockReturnValueOnce(fail(429))
        .mockReturnValueOnce(ok({ results: [{ id: 'r', memory: 'ok' }] }));
      const res = await provider.getAll();
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(res.results).toHaveLength(1);
    });

    it('retries on 500 then succeeds', async () => {
      mockFetch
        .mockReturnValueOnce(fail(500))
        .mockReturnValueOnce(ok({ results: [] }));
      const res = await provider.search('q');
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(res.results).toEqual([]);
    });

    it('throws after exhausting retries on 500', async () => {
      mockFetch.mockReturnValue(fail(500));
      await expect(provider.getAll()).rejects.toThrow('HTTP 500');
    });

    it('throws after exhausting retries on 429', async () => {
      mockFetch.mockReturnValue(fail(429));
      await expect(provider.getAll()).rejects.toThrow('HTTP 429');
    });

    it('throws on timeout (abort)', async () => {
      mockFetch.mockImplementation(
        (_url: string, init: any) =>
          new Promise((_resolve, reject) => {
            const listener = () => reject(new DOMException('Aborted', 'AbortError'));
            if (init?.signal) {
              init.signal.addEventListener('abort', listener);
            }
          })
      );
      await expect(provider.getAll()).rejects.toThrow();
    });
  });
});
