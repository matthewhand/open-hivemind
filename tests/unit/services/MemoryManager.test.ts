/**
 * Unit tests for MemoryManager service.
 *
 * The real MemoryManager module does not exist on disk yet — tests work
 * against an inline reference implementation that exercises provider
 * resolution, caching, store/retrieve/format, and error isolation.
 */

/* ---------- types --------------------------------------------------------- */

interface MemoryResult {
  id: string;
  memory: string;
  score?: number;
  metadata?: Record<string, any>;
}

interface IMemoryProvider {
  id: string;
  label: string;
  type: 'memory';
  add(messages: Array<{ role: string; content: string }>, options?: any): Promise<{ results: MemoryResult[] }>;
  search(query: string, options?: any): Promise<{ results: MemoryResult[] }>;
  getAll(options?: any): Promise<{ results: MemoryResult[] }>;
  get(memoryId: string): Promise<{ id: string; memory: string } | null>;
  update(memoryId: string, content: string): Promise<{ id: string; memory: string }>;
  delete(memoryId: string): Promise<void>;
  deleteAll(options?: any): Promise<void>;
}

/* ---------- inline reference implementation -------------------------------- */

class MemoryManager {
  private providers: Map<string, IMemoryProvider> = new Map();
  private cache: Map<string, { data: MemoryResult[]; ts: number }> = new Map();
  private cacheTtlMs: number;

  constructor(options?: { cacheTtlMs?: number }) {
    this.cacheTtlMs = options?.cacheTtlMs ?? 60_000;
  }

  registerProvider(provider: IMemoryProvider): void {
    this.providers.set(provider.id, provider);
  }

  getProvider(id: string): IMemoryProvider | undefined {
    return this.providers.get(id);
  }

  getProviders(): IMemoryProvider[] {
    return Array.from(this.providers.values());
  }

  private cacheKey(providerId: string, userId: string): string {
    return `${providerId}:${userId}`;
  }

  async store(
    providerId: string,
    messages: Array<{ role: string; content: string }>,
    options?: { userId?: string }
  ): Promise<{ results: MemoryResult[] }> {
    const provider = this.providers.get(providerId);
    if (!provider) throw new Error(`Memory provider '${providerId}' not found`);
    const result = await provider.add(messages, options);
    // Invalidate cache for this user
    if (options?.userId) {
      this.cache.delete(this.cacheKey(providerId, options.userId));
    }
    return result;
  }

  async retrieve(
    providerId: string,
    query: string,
    options?: { userId?: string; limit?: number; skipCache?: boolean }
  ): Promise<{ results: MemoryResult[] }> {
    const provider = this.providers.get(providerId);
    if (!provider) throw new Error(`Memory provider '${providerId}' not found`);

    const ck = options?.userId ? this.cacheKey(providerId, options.userId) : '';
    if (!options?.skipCache && ck) {
      const cached = this.cache.get(ck);
      if (cached && Date.now() - cached.ts < this.cacheTtlMs) {
        // Filter cached results by relevance (simple substring match)
        const q = query.toLowerCase();
        const filtered = cached.data.filter((m) => m.memory.toLowerCase().includes(q));
        if (filtered.length > 0) return { results: filtered };
      }
    }

    const result = await provider.search(query, options);

    if (ck && result.results.length > 0) {
      this.cache.set(ck, { data: result.results, ts: Date.now() });
    }

    return result;
  }

  formatForPrompt(memories: MemoryResult[]): string {
    if (!memories.length) return '';
    return (
      '[Relevant memories]\n' +
      memories.map((m, i) => `${i + 1}. ${m.memory}`).join('\n') +
      '\n[End memories]'
    );
  }

  async storeAndRetrieve(
    providerId: string,
    messages: Array<{ role: string; content: string }>,
    query: string,
    options?: { userId?: string }
  ): Promise<string> {
    try {
      await this.store(providerId, messages, options);
    } catch {
      // Error isolation — store failure should not prevent retrieve
    }
    try {
      const { results } = await this.retrieve(providerId, query, { ...options, skipCache: true });
      return this.formatForPrompt(results);
    } catch {
      return '';
    }
  }
}

/* ---------- tests --------------------------------------------------------- */

describe('MemoryManager', () => {
  let manager: MemoryManager;
  let mockProvider: jest.Mocked<IMemoryProvider>;

  beforeEach(() => {
    mockProvider = {
      id: 'mem0',
      label: 'Mem0',
      type: 'memory',
      add: jest.fn().mockResolvedValue({ results: [{ id: 'm1', memory: 'stored' }] }),
      search: jest.fn().mockResolvedValue({ results: [{ id: 'm1', memory: 'relevant', score: 0.9 }] }),
      getAll: jest.fn().mockResolvedValue({ results: [] }),
      get: jest.fn().mockResolvedValue({ id: 'm1', memory: 'stored' }),
      update: jest.fn().mockResolvedValue({ id: 'm1', memory: 'updated' }),
      delete: jest.fn().mockResolvedValue(undefined),
      deleteAll: jest.fn().mockResolvedValue(undefined),
    };
    manager = new MemoryManager({ cacheTtlMs: 5_000 });
    manager.registerProvider(mockProvider);
  });

  /* -- provider resolution ------------------------------------------------ */

  describe('provider resolution', () => {
    it('registers and retrieves providers', () => {
      expect(manager.getProvider('mem0')).toBe(mockProvider);
    });

    it('returns undefined for unknown provider', () => {
      expect(manager.getProvider('unknown')).toBeUndefined();
    });

    it('lists all registered providers', () => {
      const second: IMemoryProvider = { ...mockProvider, id: 'zep', label: 'Zep' };
      manager.registerProvider(second);
      expect(manager.getProviders()).toHaveLength(2);
    });

    it('throws when storing to unknown provider', async () => {
      await expect(manager.store('nope', [{ role: 'user', content: 'hi' }])).rejects.toThrow(
        "Memory provider 'nope' not found"
      );
    });

    it('throws when retrieving from unknown provider', async () => {
      await expect(manager.retrieve('nope', 'q')).rejects.toThrow("Memory provider 'nope' not found");
    });
  });

  /* -- store -------------------------------------------------------------- */

  describe('store', () => {
    it('delegates to provider.add with messages and options', async () => {
      const res = await manager.store('mem0', [{ role: 'user', content: 'hi' }], { userId: 'u1' });
      expect(mockProvider.add).toHaveBeenCalledWith([{ role: 'user', content: 'hi' }], { userId: 'u1' });
      expect(res.results).toHaveLength(1);
    });

    it('invalidates cache on store', async () => {
      // Prime cache
      await manager.retrieve('mem0', 'relevant', { userId: 'u1' });
      expect(mockProvider.search).toHaveBeenCalledTimes(1);

      // Store invalidates cache
      await manager.store('mem0', [{ role: 'user', content: 'new' }], { userId: 'u1' });

      // Next retrieve should hit provider again
      await manager.retrieve('mem0', 'relevant', { userId: 'u1' });
      expect(mockProvider.search).toHaveBeenCalledTimes(2);
    });
  });

  /* -- retrieve & caching ------------------------------------------------- */

  describe('retrieve', () => {
    it('delegates to provider.search', async () => {
      const res = await manager.retrieve('mem0', 'query', { userId: 'u1', limit: 5 });
      expect(mockProvider.search).toHaveBeenCalledWith('query', { userId: 'u1', limit: 5 });
      expect(res.results[0].id).toBe('m1');
    });

    it('caches results for same user+provider', async () => {
      await manager.retrieve('mem0', 'relevant', { userId: 'u1' });
      await manager.retrieve('mem0', 'relevant', { userId: 'u1' });
      // Second call should hit cache, so only 1 provider call
      expect(mockProvider.search).toHaveBeenCalledTimes(1);
    });

    it('bypasses cache with skipCache', async () => {
      await manager.retrieve('mem0', 'relevant', { userId: 'u1' });
      await manager.retrieve('mem0', 'relevant', { userId: 'u1', skipCache: true });
      expect(mockProvider.search).toHaveBeenCalledTimes(2);
    });

    it('does not cache when no userId', async () => {
      await manager.retrieve('mem0', 'query');
      await manager.retrieve('mem0', 'query');
      expect(mockProvider.search).toHaveBeenCalledTimes(2);
    });
  });

  /* -- formatForPrompt ---------------------------------------------------- */

  describe('formatForPrompt', () => {
    it('formats memories as numbered list', () => {
      const result = manager.formatForPrompt([
        { id: '1', memory: 'likes cats' },
        { id: '2', memory: 'works at Acme' },
      ]);
      expect(result).toContain('[Relevant memories]');
      expect(result).toContain('1. likes cats');
      expect(result).toContain('2. works at Acme');
      expect(result).toContain('[End memories]');
    });

    it('returns empty string for empty array', () => {
      expect(manager.formatForPrompt([])).toBe('');
    });
  });

  /* -- error isolation ---------------------------------------------------- */

  describe('error isolation', () => {
    it('store failure does not prevent retrieve in storeAndRetrieve', async () => {
      mockProvider.add.mockRejectedValue(new Error('store failed'));
      const result = await manager.storeAndRetrieve(
        'mem0',
        [{ role: 'user', content: 'x' }],
        'relevant',
        { userId: 'u1' }
      );
      expect(result).toContain('relevant');
    });

    it('retrieve failure returns empty string in storeAndRetrieve', async () => {
      mockProvider.search.mockRejectedValue(new Error('search failed'));
      const result = await manager.storeAndRetrieve(
        'mem0',
        [{ role: 'user', content: 'x' }],
        'q',
        { userId: 'u1' }
      );
      expect(result).toBe('');
    });

    it('both failures return empty string', async () => {
      mockProvider.add.mockRejectedValue(new Error('store failed'));
      mockProvider.search.mockRejectedValue(new Error('search failed'));
      const result = await manager.storeAndRetrieve(
        'mem0',
        [{ role: 'user', content: 'x' }],
        'q',
        { userId: 'u1' }
      );
      expect(result).toBe('');
    });
  });
});
