import { MemoryManager, MemorySearchResult } from '@src/services/MemoryManager';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockGetBot = jest.fn();
jest.mock('@src/config/BotConfigurationManager', () => ({
  BotConfigurationManager: {
    getInstance: () => ({ getBot: mockGetBot }),
  },
}));

const mockGetMemoryProfileByKey = jest.fn();
jest.mock('@src/config/memoryProfiles', () => ({
  getMemoryProfileByKey: (...args: any[]) => mockGetMemoryProfileByKey(...args),
}));

const mockLoadPlugin = jest.fn();
const mockInstantiateMemoryProvider = jest.fn();
jest.mock('@src/plugins', () => ({
  loadPlugin: (...args: any[]) => mockLoadPlugin(...args),
  instantiateMemoryProvider: (...args: any[]) => mockInstantiateMemoryProvider(...args),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function freshManager(): MemoryManager {
  // Reset singleton so each test gets a clean instance.
  (MemoryManager as any).instance = undefined;
  return MemoryManager.getInstance();
}

function makeProvider(overrides?: Partial<Record<string, jest.Mock>>) {
  return {
    id: 'test-memory',
    label: 'Test Memory',
    type: 'memory' as const,
    add: jest.fn().mockResolvedValue({ results: [] }),
    search: jest.fn().mockResolvedValue({ results: [] }),
    getAll: jest.fn().mockResolvedValue({ results: [] }),
    get: jest.fn().mockResolvedValue(null),
    update: jest.fn(),
    delete: jest.fn(),
    deleteAll: jest.fn(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('MemoryManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // === Singleton ===

  describe('getInstance()', () => {
    it('returns the same instance across calls', () => {
      (MemoryManager as any).instance = undefined;
      const a = MemoryManager.getInstance();
      const b = MemoryManager.getInstance();
      expect(a).toBe(b);
    });
  });

  // === getProviderForBot ===

  describe('getProviderForBot()', () => {
    it('resolves bot config -> memory profile -> provider instance', () => {
      const mgr = freshManager();
      const provider = makeProvider();

      mockGetBot.mockReturnValue({ name: 'bot1', memoryProfile: 'prof1' });
      mockGetMemoryProfileByKey.mockReturnValue({ provider: 'mem0', config: { url: 'http://x' } });
      mockLoadPlugin.mockReturnValue({ create: jest.fn() });
      mockInstantiateMemoryProvider.mockReturnValue(provider);

      const result = mgr.getProviderForBot('bot1');

      expect(mockGetBot).toHaveBeenCalledWith('bot1');
      expect(mockGetMemoryProfileByKey).toHaveBeenCalledWith('prof1');
      expect(mockLoadPlugin).toHaveBeenCalledWith('memory-mem0');
      expect(result).toBe(provider);
    });

    it('caches the provider instance — second call does not re-instantiate', () => {
      const mgr = freshManager();
      const provider = makeProvider();

      mockGetBot.mockReturnValue({ name: 'bot1', memoryProfile: 'prof1' });
      mockGetMemoryProfileByKey.mockReturnValue({ provider: 'mem0', config: {} });
      mockLoadPlugin.mockReturnValue({});
      mockInstantiateMemoryProvider.mockReturnValue(provider);

      const first = mgr.getProviderForBot('bot1');
      const second = mgr.getProviderForBot('bot1');

      expect(first).toBe(second);
      expect(mockInstantiateMemoryProvider).toHaveBeenCalledTimes(1);
    });

    it('returns null when bot has no memoryProfile configured', () => {
      const mgr = freshManager();
      mockGetBot.mockReturnValue({ name: 'bot1' });

      expect(mgr.getProviderForBot('bot1')).toBeNull();
    });

    it('returns null when bot config is not found', () => {
      const mgr = freshManager();
      mockGetBot.mockReturnValue(undefined);

      expect(mgr.getProviderForBot('unknown')).toBeNull();
    });

    it('returns null and marks profile as failed when profile does not exist', () => {
      const mgr = freshManager();
      mockGetBot.mockReturnValue({ name: 'bot1', memoryProfile: 'missing' });
      mockGetMemoryProfileByKey.mockReturnValue(undefined);

      expect(mgr.getProviderForBot('bot1')).toBeNull();
      // Second call should skip profile resolution entirely (failedProfiles set).
      expect(mgr.getProviderForBot('bot1')).toBeNull();
      expect(mockGetMemoryProfileByKey).toHaveBeenCalledTimes(1);
    });

    it('returns null and marks profile failed when plugin instantiation throws', () => {
      const mgr = freshManager();
      mockGetBot.mockReturnValue({ name: 'bot1', memoryProfile: 'prof1' });
      mockGetMemoryProfileByKey.mockReturnValue({ provider: 'bad', config: {} });
      mockLoadPlugin.mockImplementation(() => { throw new Error('plugin not found'); });

      expect(mgr.getProviderForBot('bot1')).toBeNull();
      // Retry is skipped.
      mockLoadPlugin.mockClear();
      expect(mgr.getProviderForBot('bot1')).toBeNull();
      expect(mockLoadPlugin).not.toHaveBeenCalled();
    });
  });

  // === storeConversationMemory ===

  describe('storeConversationMemory()', () => {
    it('stores user message with metadata through the provider', async () => {
      const mgr = freshManager();
      const provider = makeProvider();
      mockGetBot.mockReturnValue({ name: 'bot1', memoryProfile: 'prof1' });
      mockGetMemoryProfileByKey.mockReturnValue({ provider: 'mem0', config: {} });
      mockLoadPlugin.mockReturnValue({});
      mockInstantiateMemoryProvider.mockReturnValue(provider);

      await mgr.storeConversationMemory('bot1', 'Hello!', 'user', {
        userId: 'u1',
        channelId: 'ch1',
      });

      expect(provider.add).toHaveBeenCalledTimes(1);
      const [messages, opts] = provider.add.mock.calls[0];
      expect(messages).toEqual([{ role: 'user', content: 'Hello!' }]);
      expect(opts.agentId).toBe('bot1');
      expect(opts.userId).toBe('u1');
      expect(opts.metadata.botName).toBe('bot1');
      expect(typeof opts.metadata.timestamp).toBe('string');
    });

    it('stores assistant message', async () => {
      const mgr = freshManager();
      const provider = makeProvider();
      mockGetBot.mockReturnValue({ name: 'bot1', memoryProfile: 'prof1' });
      mockGetMemoryProfileByKey.mockReturnValue({ provider: 'mem0', config: {} });
      mockLoadPlugin.mockReturnValue({});
      mockInstantiateMemoryProvider.mockReturnValue(provider);

      await mgr.storeConversationMemory('bot1', 'Sure!', 'assistant');
      const [messages] = provider.add.mock.calls[0];
      expect(messages).toEqual([{ role: 'assistant', content: 'Sure!' }]);
    });

    it('returns silently when bot has no memory provider', async () => {
      const mgr = freshManager();
      mockGetBot.mockReturnValue({ name: 'bot1' }); // no memoryProfile

      // Should not throw.
      await expect(mgr.storeConversationMemory('bot1', 'Hi', 'user')).resolves.toBeUndefined();
    });

    it('catches provider.add errors without breaking the pipeline', async () => {
      const mgr = freshManager();
      const provider = makeProvider({
        add: jest.fn().mockRejectedValue(new Error('storage failure')),
      });
      mockGetBot.mockReturnValue({ name: 'bot1', memoryProfile: 'prof1' });
      mockGetMemoryProfileByKey.mockReturnValue({ provider: 'mem0', config: {} });
      mockLoadPlugin.mockReturnValue({});
      mockInstantiateMemoryProvider.mockReturnValue(provider);

      await expect(mgr.storeConversationMemory('bot1', 'Hi', 'user')).resolves.toBeUndefined();
    });
  });

  // === retrieveRelevantMemories ===

  describe('retrieveRelevantMemories()', () => {
    it('searches and returns relevant context', async () => {
      const mgr = freshManager();
      const provider = makeProvider({
        search: jest.fn().mockResolvedValue({
          results: [
            { id: 'm1', memory: 'The user likes TypeScript', score: 0.95 },
            { id: 'm2', memory: 'The user prefers dark mode', score: 0.8 },
          ],
        }),
      });
      mockGetBot.mockReturnValue({ name: 'bot1', memoryProfile: 'prof1' });
      mockGetMemoryProfileByKey.mockReturnValue({ provider: 'mem0', config: {} });
      mockLoadPlugin.mockReturnValue({});
      mockInstantiateMemoryProvider.mockReturnValue(provider);

      const results = await mgr.retrieveRelevantMemories('bot1', 'preferences');

      expect(provider.search).toHaveBeenCalledWith('preferences', {
        agentId: 'bot1',
        limit: 5,
      });
      expect(results).toHaveLength(2);
      expect(results[0]).toMatchObject({ id: 'm1', memory: 'The user likes TypeScript', score: 0.95 });
    });

    it('passes custom limit to provider', async () => {
      const mgr = freshManager();
      const provider = makeProvider();
      mockGetBot.mockReturnValue({ name: 'bot1', memoryProfile: 'prof1' });
      mockGetMemoryProfileByKey.mockReturnValue({ provider: 'mem0', config: {} });
      mockLoadPlugin.mockReturnValue({});
      mockInstantiateMemoryProvider.mockReturnValue(provider);

      await mgr.retrieveRelevantMemories('bot1', 'query', 10);

      expect(provider.search).toHaveBeenCalledWith('query', { agentId: 'bot1', limit: 10 });
    });

    it('returns empty array when bot has no memory provider', async () => {
      const mgr = freshManager();
      mockGetBot.mockReturnValue({ name: 'bot1' });

      const results = await mgr.retrieveRelevantMemories('bot1', 'anything');
      expect(results).toEqual([]);
    });

    it('returns empty array when provider.search throws', async () => {
      const mgr = freshManager();
      const provider = makeProvider({
        search: jest.fn().mockRejectedValue(new Error('search failure')),
      });
      mockGetBot.mockReturnValue({ name: 'bot1', memoryProfile: 'prof1' });
      mockGetMemoryProfileByKey.mockReturnValue({ provider: 'mem0', config: {} });
      mockLoadPlugin.mockReturnValue({});
      mockInstantiateMemoryProvider.mockReturnValue(provider);

      const results = await mgr.retrieveRelevantMemories('bot1', 'anything');
      expect(results).toEqual([]);
    });

  });

  // === formatMemoriesForPrompt ===

  describe('formatMemoriesForPrompt()', () => {
    it('formats memories as readable bullet list', () => {
      const mgr = freshManager();
      const memories: MemorySearchResult[] = [
        { id: '1', memory: 'Likes cats' },
        { id: '2', memory: 'Prefers concise answers' },
      ];

      const result = mgr.formatMemoriesForPrompt(memories);
      expect(result).toContain('Relevant memories from previous conversations:');
      expect(result).toContain('- Likes cats');
      expect(result).toContain('- Prefers concise answers');
    });

    it('returns empty string for empty array', () => {
      const mgr = freshManager();
      expect(mgr.formatMemoriesForPrompt([])).toBe('');
    });

    it('returns empty string for null/undefined input', () => {
      const mgr = freshManager();
      expect(mgr.formatMemoriesForPrompt(null as any)).toBe('');
      expect(mgr.formatMemoriesForPrompt(undefined as any)).toBe('');
    });
  });

  // === clearProviderCache ===

  describe('clearProviderCache()', () => {
    it('clears a specific profile', () => {
      const mgr = freshManager();
      const provider = makeProvider();
      mockGetBot.mockReturnValue({ name: 'bot1', memoryProfile: 'prof1' });
      mockGetMemoryProfileByKey.mockReturnValue({ provider: 'mem0', config: {} });
      mockLoadPlugin.mockReturnValue({});
      mockInstantiateMemoryProvider.mockReturnValue(provider);

      mgr.getProviderForBot('bot1'); // populate cache
      mgr.clearProviderCache('prof1');

      // After clearing, next call should re-instantiate.
      mgr.getProviderForBot('bot1');
      expect(mockInstantiateMemoryProvider).toHaveBeenCalledTimes(2);
    });

    it('clears all providers when no key given', () => {
      const mgr = freshManager();
      const provider = makeProvider();
      mockGetBot.mockReturnValue({ name: 'bot1', memoryProfile: 'prof1' });
      mockGetMemoryProfileByKey.mockReturnValue({ provider: 'mem0', config: {} });
      mockLoadPlugin.mockReturnValue({});
      mockInstantiateMemoryProvider.mockReturnValue(provider);

      mgr.getProviderForBot('bot1');
      mgr.clearProviderCache();
      mgr.getProviderForBot('bot1');
      expect(mockInstantiateMemoryProvider).toHaveBeenCalledTimes(2);
    });

    it('clears failed profiles so they can be retried', () => {
      const mgr = freshManager();
      mockGetBot.mockReturnValue({ name: 'bot1', memoryProfile: 'bad' });
      mockGetMemoryProfileByKey.mockReturnValue(undefined); // fails

      mgr.getProviderForBot('bot1'); // marks as failed
      mgr.clearProviderCache('bad');

      // Now the profile lookup should happen again.
      mockGetMemoryProfileByKey.mockClear();
      mockGetMemoryProfileByKey.mockReturnValue({ provider: 'mem0', config: {} });
      mockLoadPlugin.mockReturnValue({});
      mockInstantiateMemoryProvider.mockReturnValue(makeProvider());

      expect(mgr.getProviderForBot('bot1')).not.toBeNull();
      expect(mockGetMemoryProfileByKey).toHaveBeenCalledWith('bad');
    });
  });
});
