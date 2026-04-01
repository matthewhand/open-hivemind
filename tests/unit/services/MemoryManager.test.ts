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
    addMemory: jest.fn().mockResolvedValue({ id: 'mem-1', content: '' }),
    searchMemories: jest.fn().mockResolvedValue({ results: [] }),
    getMemories: jest.fn().mockResolvedValue([]),
    getMemory: jest.fn().mockResolvedValue(null),
    updateMemory: jest.fn(),
    deleteMemory: jest.fn(),
    deleteAll: jest.fn(),
    healthCheck: jest.fn().mockResolvedValue({ status: 'ok' }),
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
    it('resolves bot config -> memory profile -> provider instance', async () => {
      const mgr = freshManager();
      const provider = makeProvider();

      mockGetBot.mockReturnValue({ name: 'bot1', memoryProfile: 'prof1' });
      mockGetMemoryProfileByKey.mockReturnValue({ provider: 'mem0', config: { url: 'http://x' } });
      mockLoadPlugin.mockResolvedValue({ create: jest.fn() });
      mockInstantiateMemoryProvider.mockReturnValue(provider);

      const result = await mgr.getProviderForBot('bot1');

      expect(mockGetBot).toHaveBeenCalledWith('bot1');
      expect(mockGetMemoryProfileByKey).toHaveBeenCalledWith('prof1');
      expect(mockLoadPlugin).toHaveBeenCalledWith('memory-mem0');
      expect(result).toBe(provider);
    });

    it('caches the provider instance — second call does not re-instantiate', async () => {
      const mgr = freshManager();
      const provider = makeProvider();

      mockGetBot.mockReturnValue({ name: 'bot1', memoryProfile: 'prof1' });
      mockGetMemoryProfileByKey.mockReturnValue({ provider: 'mem0', config: {} });
      mockLoadPlugin.mockResolvedValue({});
      mockInstantiateMemoryProvider.mockReturnValue(provider);

      const first = await mgr.getProviderForBot('bot1');
      const second = await mgr.getProviderForBot('bot1');

      expect(first).toBe(second);
      expect(mockInstantiateMemoryProvider).toHaveBeenCalledTimes(1);
    });

    it('returns null when bot has no memoryProfile configured', async () => {
      const mgr = freshManager();
      mockGetBot.mockReturnValue({ name: 'bot1' });

      expect(await mgr.getProviderForBot('bot1')).toBeNull();
    });

    it('returns null when bot config is not found', async () => {
      const mgr = freshManager();
      mockGetBot.mockReturnValue(undefined);

      expect(await mgr.getProviderForBot('unknown')).toBeNull();
    });

    it('returns null and marks profile as failed when profile does not exist', async () => {
      const mgr = freshManager();
      mockGetBot.mockReturnValue({ name: 'bot1', memoryProfile: 'missing' });
      mockGetMemoryProfileByKey.mockReturnValue(undefined);

      expect(await mgr.getProviderForBot('bot1')).toBeNull();
      // Second call should skip profile resolution entirely (failedProfiles set).
      expect(await mgr.getProviderForBot('bot1')).toBeNull();
      expect(mockGetMemoryProfileByKey).toHaveBeenCalledTimes(1);
    });

    it('returns null and marks profile failed when plugin instantiation throws', async () => {
      const mgr = freshManager();
      mockGetBot.mockReturnValue({ name: 'bot1', memoryProfile: 'prof1' });
      mockGetMemoryProfileByKey.mockReturnValue({ provider: 'bad', config: {} });
      mockLoadPlugin.mockRejectedValue(new Error('plugin not found'));

      expect(await mgr.getProviderForBot('bot1')).toBeNull();
      // Retry is skipped.
      mockLoadPlugin.mockClear();
      expect(await mgr.getProviderForBot('bot1')).toBeNull();
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
      mockLoadPlugin.mockResolvedValue({});
      mockInstantiateMemoryProvider.mockReturnValue(provider);

      await mgr.storeConversationMemory('bot1', 'Hello!', 'user', {
        userId: 'u1',
        channelId: 'ch1',
      });

      expect(provider.addMemory).toHaveBeenCalledTimes(1);
      const [content, metadata, opts] = provider.addMemory.mock.calls[0];
      expect(content).toBe('Hello!');
      expect(opts.agentId).toBe('bot1');
      expect(opts.userId).toBe('u1');
      expect(metadata.botName).toBe('bot1');
      expect(typeof metadata.timestamp).toBe('string');
    });

    it('stores assistant message', async () => {
      const mgr = freshManager();
      const provider = makeProvider();
      mockGetBot.mockReturnValue({ name: 'bot1', memoryProfile: 'prof1' });
      mockGetMemoryProfileByKey.mockReturnValue({ provider: 'mem0', config: {} });
      mockLoadPlugin.mockResolvedValue({});
      mockInstantiateMemoryProvider.mockReturnValue(provider);

      await mgr.storeConversationMemory('bot1', 'Sure!', 'assistant');
      const [content] = provider.addMemory.mock.calls[0];
      expect(content).toBe('Sure!');
    });

    it('returns silently when bot has no memory provider', async () => {
      const mgr = freshManager();
      mockGetBot.mockReturnValue({ name: 'bot1' }); // no memoryProfile

      // Should not throw.
      await expect(mgr.storeConversationMemory('bot1', 'Hi', 'user')).resolves.toBeUndefined();
    });

    it('catches provider.addMemory errors without breaking the pipeline', async () => {
      const mgr = freshManager();
      const provider = makeProvider({
        addMemory: jest.fn().mockRejectedValue(new Error('storage failure')),
      });
      mockGetBot.mockReturnValue({ name: 'bot1', memoryProfile: 'prof1' });
      mockGetMemoryProfileByKey.mockReturnValue({ provider: 'mem0', config: {} });
      mockLoadPlugin.mockResolvedValue({});
      mockInstantiateMemoryProvider.mockReturnValue(provider);

      await expect(mgr.storeConversationMemory('bot1', 'Hi', 'user')).resolves.toBeUndefined();
    });
  });

  // === retrieveRelevantMemories ===

  describe('retrieveRelevantMemories()', () => {
    it('searches and returns relevant context', async () => {
      const mgr = freshManager();
      const provider = makeProvider({
        searchMemories: jest.fn().mockResolvedValue({
          results: [
            { id: 'm1', content: 'The user likes TypeScript', score: 0.95 },
            { id: 'm2', content: 'The user prefers dark mode', score: 0.8 },
          ],
        }),
      });
      mockGetBot.mockReturnValue({ name: 'bot1', memoryProfile: 'prof1' });
      mockGetMemoryProfileByKey.mockReturnValue({ provider: 'mem0', config: {} });
      mockLoadPlugin.mockResolvedValue({});
      mockInstantiateMemoryProvider.mockReturnValue(provider);

      const results = await mgr.retrieveRelevantMemories('bot1', 'preferences');

      expect(provider.searchMemories).toHaveBeenCalledWith('preferences', {
        agentId: 'bot1',
        limit: 5,
      });
      expect(results).toHaveLength(2);
      expect(results[0]).toMatchObject({
        id: 'm1',
        memory: 'The user likes TypeScript',
        score: 0.95,
      });
    });

    it('passes custom limit to provider', async () => {
      const mgr = freshManager();
      const provider = makeProvider();
      mockGetBot.mockReturnValue({ name: 'bot1', memoryProfile: 'prof1' });
      mockGetMemoryProfileByKey.mockReturnValue({ provider: 'mem0', config: {} });
      mockLoadPlugin.mockResolvedValue({});
      mockInstantiateMemoryProvider.mockReturnValue(provider);

      await mgr.retrieveRelevantMemories('bot1', 'query', 10);

      expect(provider.searchMemories).toHaveBeenCalledWith('query', { agentId: 'bot1', limit: 10 });
    });

    it('returns empty array when bot has no memory provider', async () => {
      const mgr = freshManager();
      mockGetBot.mockReturnValue({ name: 'bot1' });

      const results = await mgr.retrieveRelevantMemories('bot1', 'anything');
      expect(results).toEqual([]);
    });

    it('returns empty array when provider.searchMemories throws', async () => {
      const mgr = freshManager();
      const provider = makeProvider({
        searchMemories: jest.fn().mockRejectedValue(new Error('search failure')),
      });
      mockGetBot.mockReturnValue({ name: 'bot1', memoryProfile: 'prof1' });
      mockGetMemoryProfileByKey.mockReturnValue({ provider: 'mem0', config: {} });
      mockLoadPlugin.mockResolvedValue({});
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
    it('clears a specific profile', async () => {
      const mgr = freshManager();
      const provider = makeProvider();
      mockGetBot.mockReturnValue({ name: 'bot1', memoryProfile: 'prof1' });
      mockGetMemoryProfileByKey.mockReturnValue({ provider: 'mem0', config: {} });
      mockLoadPlugin.mockResolvedValue({});
      mockInstantiateMemoryProvider.mockReturnValue(provider);

      await mgr.getProviderForBot('bot1'); // populate cache
      mgr.clearProviderCache('prof1');

      // After clearing, next call should re-instantiate.
      await mgr.getProviderForBot('bot1');
      expect(mockInstantiateMemoryProvider).toHaveBeenCalledTimes(2);
    });

    it('clears all providers when no key given', async () => {
      const mgr = freshManager();
      const provider = makeProvider();
      mockGetBot.mockReturnValue({ name: 'bot1', memoryProfile: 'prof1' });
      mockGetMemoryProfileByKey.mockReturnValue({ provider: 'mem0', config: {} });
      mockLoadPlugin.mockResolvedValue({});
      mockInstantiateMemoryProvider.mockReturnValue(provider);

      await mgr.getProviderForBot('bot1');
      mgr.clearProviderCache();
      await mgr.getProviderForBot('bot1');
      expect(mockInstantiateMemoryProvider).toHaveBeenCalledTimes(2);
    });

    it('clears failed profiles so they can be retried', async () => {
      const mgr = freshManager();
      mockGetBot.mockReturnValue({ name: 'bot1', memoryProfile: 'bad' });
      mockGetMemoryProfileByKey.mockReturnValue(undefined); // fails

      await mgr.getProviderForBot('bot1'); // marks as failed
      mgr.clearProviderCache('bad');

      // Now the profile lookup should happen again.
      mockGetMemoryProfileByKey.mockClear();
      mockGetMemoryProfileByKey.mockReturnValue({ provider: 'mem0', config: {} });
      mockLoadPlugin.mockResolvedValue({});
      mockInstantiateMemoryProvider.mockReturnValue(makeProvider());

      expect(await mgr.getProviderForBot('bot1')).not.toBeNull();
      expect(mockGetMemoryProfileByKey).toHaveBeenCalledWith('bad');
    });
  });
});
