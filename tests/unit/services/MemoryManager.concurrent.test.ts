/**
 * Concurrent access and edge-case tests for MemoryManager.
 *
 * Covers: concurrent retrieval from multiple bots, concurrent store + retrieve,
 * race conditions on duplicate stores, provider instantiation deduplication,
 * config-change cache invalidation, bot name format variations, shared provider
 * instances, and metadata edge cases.
 */

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

/** Wire up mocks so getProviderForBot(botName) resolves to a given provider. */
function wireBot(botName: string, profileKey: string, provider: ReturnType<typeof makeProvider>) {
  mockGetBot.mockImplementation((name: string) => {
    if (name === botName) return { name: botName, memoryProfile: profileKey };
    return undefined;
  });
  mockGetMemoryProfileByKey.mockImplementation((key: string) => {
    if (key === profileKey) return { provider: 'mem0', config: { url: 'http://x' } };
    return undefined;
  });
  mockLoadPlugin.mockReturnValue({});
  mockInstantiateMemoryProvider.mockReturnValue(provider);
}

/** Wire up multiple bots, each with its own profile and (optionally shared) provider. */
function wireMultipleBots(
  bots: Array<{ name: string; profile: string; provider: ReturnType<typeof makeProvider> }>
) {
  const botMap = new Map(bots.map((b) => [b.name, b]));
  const profileMap = new Map(bots.map((b) => [b.profile, b]));

  mockGetBot.mockImplementation((name: string) => {
    const bot = botMap.get(name);
    return bot ? { name: bot.name, memoryProfile: bot.profile } : undefined;
  });
  mockGetMemoryProfileByKey.mockImplementation((key: string) => {
    const bot = profileMap.get(key);
    return bot ? { provider: 'mem0', config: { url: 'http://x' } } : undefined;
  });
  mockLoadPlugin.mockReturnValue({});
  mockInstantiateMemoryProvider.mockImplementation((_mod: any, _cfg: any) => {
    // Return the provider associated with the most recently looked-up profile.
    // Since provider caching is keyed by profile, the first call per profile wins.
    return bots[0].provider;
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('MemoryManager — concurrent access & edge cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // Concurrent retrieval from multiple bots
  // =========================================================================

  describe('concurrent retrieveRelevantMemories from multiple bots', () => {
    it('runs searches in parallel without cross-contamination', async () => {
      const mgr = freshManager();

      const providerA = makeProvider({
        search: jest.fn().mockResolvedValue({
          results: [{ id: 'a1', memory: 'Memory for bot A', score: 0.9 }],
        }),
      });
      const providerB = makeProvider({
        search: jest.fn().mockResolvedValue({
          results: [{ id: 'b1', memory: 'Memory for bot B', score: 0.8 }],
        }),
      });

      // Wire bots with separate profiles so each gets its own provider.
      const botEntries = [
        { name: 'botA', profile: 'profA', provider: providerA },
        { name: 'botB', profile: 'profB', provider: providerB },
      ];

      mockGetBot.mockImplementation((name: string) => {
        const e = botEntries.find((b) => b.name === name);
        return e ? { name: e.name, memoryProfile: e.profile } : undefined;
      });
      mockGetMemoryProfileByKey.mockImplementation((key: string) => {
        const e = botEntries.find((b) => b.profile === key);
        return e ? { provider: 'mem0', config: {} } : undefined;
      });
      mockLoadPlugin.mockReturnValue({});
      mockInstantiateMemoryProvider.mockImplementation((_mod: any, _cfg: any) => {
        // Use the last profile key that was looked up to pick the right provider.
        const lastProfileCall = mockGetMemoryProfileByKey.mock.calls;
        const lastKey = lastProfileCall[lastProfileCall.length - 1]?.[0];
        const entry = botEntries.find((b) => b.profile === lastKey);
        return entry?.provider ?? providerA;
      });

      const [resultsA, resultsB] = await Promise.all([
        mgr.retrieveRelevantMemories('botA', 'query A'),
        mgr.retrieveRelevantMemories('botB', 'query B'),
      ]);

      expect(resultsA).toHaveLength(1);
      expect(resultsA[0].memory).toBe('Memory for bot A');
      expect(resultsB).toHaveLength(1);
      expect(resultsB[0].memory).toBe('Memory for bot B');

      expect(providerA.search).toHaveBeenCalledWith(
        'query A',
        expect.objectContaining({ agentId: 'botA' })
      );
      expect(providerB.search).toHaveBeenCalledWith(
        'query B',
        expect.objectContaining({ agentId: 'botB' })
      );
    });
  });

  // =========================================================================
  // Concurrent store + retrieve (store should not block retrieval)
  // =========================================================================

  describe('concurrent store + retrieve', () => {
    it('store does not block concurrent retrieve', async () => {
      const mgr = freshManager();
      let storeResolveFn: (() => void) | undefined;
      const storePromise = new Promise<void>((resolve) => {
        storeResolveFn = resolve;
      });

      const provider = makeProvider({
        add: jest.fn().mockImplementation(() => storePromise.then(() => ({ results: [] }))),
        search: jest.fn().mockResolvedValue({
          results: [{ id: 's1', memory: 'instant result', score: 0.9 }],
        }),
      });
      wireBot('bot1', 'prof1', provider);

      // Fire store (will hang until we resolve) and retrieve simultaneously.
      const storeTask = mgr.storeConversationMemory('bot1', 'save this', 'user');
      const retrieveTask = mgr.retrieveRelevantMemories('bot1', 'query');

      // Retrieve should resolve immediately despite the pending store.
      const results = await retrieveTask;
      expect(results).toHaveLength(1);
      expect(results[0].memory).toBe('instant result');

      // Now let the store finish.
      storeResolveFn!();
      await storeTask;
      expect(provider.add).toHaveBeenCalledTimes(1);
    });
  });

  // =========================================================================
  // Race condition: two messages arrive for same bot, both trigger store
  // =========================================================================

  describe('race condition: two stores for same bot', () => {
    it('both stores complete without conflict', async () => {
      const mgr = freshManager();
      const addResults: string[] = [];
      const provider = makeProvider({
        add: jest.fn().mockImplementation(async (msgs: any[]) => {
          addResults.push(msgs[0].content);
          return { results: [{ id: `mem-${addResults.length}`, memory: msgs[0].content }] };
        }),
      });
      wireBot('bot1', 'prof1', provider);

      await Promise.all([
        mgr.storeConversationMemory('bot1', 'message one', 'user'),
        mgr.storeConversationMemory('bot1', 'message two', 'user'),
      ]);

      expect(provider.add).toHaveBeenCalledTimes(2);
      expect(addResults).toContain('message one');
      expect(addResults).toContain('message two');
    });

    it('one failing store does not prevent the other from succeeding', async () => {
      const mgr = freshManager();
      let callCount = 0;
      const provider = makeProvider({
        add: jest.fn().mockImplementation(async () => {
          callCount++;
          if (callCount === 1) throw new Error('transient failure');
          return { results: [] };
        }),
      });
      wireBot('bot1', 'prof1', provider);

      // Both should resolve (failures are swallowed).
      await Promise.all([
        mgr.storeConversationMemory('bot1', 'msg A', 'user'),
        mgr.storeConversationMemory('bot1', 'msg B', 'user'),
      ]);

      expect(provider.add).toHaveBeenCalledTimes(2);
    });
  });

  // =========================================================================
  // Provider instantiation dedup: two bots, same profile, one provider
  // =========================================================================

  describe('provider instantiation deduplication', () => {
    it('two bots sharing the same profile get the same provider instance', () => {
      const mgr = freshManager();
      const sharedProvider = makeProvider();

      // Both bots point to the same profile key.
      mockGetBot.mockImplementation((name: string) => ({
        name,
        memoryProfile: 'shared-profile',
      }));
      mockGetMemoryProfileByKey.mockReturnValue({ provider: 'mem0', config: {} });
      mockLoadPlugin.mockReturnValue({});
      mockInstantiateMemoryProvider.mockReturnValue(sharedProvider);

      const p1 = mgr.getProviderForBot('botAlpha');
      const p2 = mgr.getProviderForBot('botBeta');

      expect(p1).toBe(p2);
      expect(p1).toBe(sharedProvider);
      // instantiateMemoryProvider should have been called only once since the
      // second bot hits the cache for 'shared-profile'.
      expect(mockInstantiateMemoryProvider).toHaveBeenCalledTimes(1);
    });
  });

  // =========================================================================
  // Config change: clearProviderCache then re-resolve
  // =========================================================================

  describe('config change: clearProviderCache then re-resolve', () => {
    it('new config is picked up after cache clear', () => {
      const mgr = freshManager();
      const oldProvider = makeProvider();
      const newProvider = makeProvider();

      wireBot('bot1', 'prof1', oldProvider);
      const first = mgr.getProviderForBot('bot1');
      expect(first).toBe(oldProvider);

      // Simulate config change: now instantiate returns a different provider.
      mockInstantiateMemoryProvider.mockReturnValue(newProvider);
      mgr.clearProviderCache('prof1');

      const second = mgr.getProviderForBot('bot1');
      expect(second).toBe(newProvider);
      expect(second).not.toBe(first);
    });

    it('clearProviderCache(undefined) resets all profiles and failed markers', () => {
      const mgr = freshManager();

      // Set up a failed profile.
      mockGetBot.mockReturnValue({ name: 'badBot', memoryProfile: 'bad' });
      mockGetMemoryProfileByKey.mockReturnValue(undefined);
      expect(mgr.getProviderForBot('badBot')).toBeNull();

      // Now fix the profile and clear all.
      const provider = makeProvider();
      mockGetMemoryProfileByKey.mockReturnValue({ provider: 'mem0', config: {} });
      mockLoadPlugin.mockReturnValue({});
      mockInstantiateMemoryProvider.mockReturnValue(provider);

      mgr.clearProviderCache();
      expect(mgr.getProviderForBot('badBot')).toBe(provider);
    });
  });

  // =========================================================================
  // Storage with metadata edge cases
  // =========================================================================

  describe('storage with metadata edge cases', () => {
    it('handles null metadata values', async () => {
      const mgr = freshManager();
      const provider = makeProvider();
      wireBot('bot1', 'prof1', provider);

      await mgr.storeConversationMemory('bot1', 'hello', 'user', {
        userId: null as any,
        channelId: null as any,
      });

      expect(provider.add).toHaveBeenCalledTimes(1);
      const [, opts] = provider.add.mock.calls[0];
      expect(opts.metadata.channelId).toBeNull();
    });

    it('handles undefined metadata values', async () => {
      const mgr = freshManager();
      const provider = makeProvider();
      wireBot('bot1', 'prof1', provider);

      await mgr.storeConversationMemory('bot1', 'hello', 'user', {
        userId: undefined,
        channelId: undefined,
      });

      expect(provider.add).toHaveBeenCalledTimes(1);
    });

    it('handles special characters in metadata', async () => {
      const mgr = freshManager();
      const provider = makeProvider();
      wireBot('bot1', 'prof1', provider);

      await mgr.storeConversationMemory('bot1', 'hello', 'user', {
        userId: 'user\u0000with\u0000nulls',
        channelId: '\u{1F600}\u{1F680}',
        custom: 'line1\nline2\ttab',
      });

      expect(provider.add).toHaveBeenCalledTimes(1);
      const [, opts] = provider.add.mock.calls[0];
      expect(opts.metadata.channelId).toBe('\u{1F600}\u{1F680}');
    });

    it('handles very long metadata values', async () => {
      const mgr = freshManager();
      const provider = makeProvider();
      wireBot('bot1', 'prof1', provider);

      const longValue = 'x'.repeat(100_000);
      await mgr.storeConversationMemory('bot1', 'hello', 'user', {
        userId: 'u1',
        longField: longValue,
      });

      expect(provider.add).toHaveBeenCalledTimes(1);
      const [, opts] = provider.add.mock.calls[0];
      expect(opts.metadata.longField).toHaveLength(100_000);
    });

    it('handles empty metadata object', async () => {
      const mgr = freshManager();
      const provider = makeProvider();
      wireBot('bot1', 'prof1', provider);

      await mgr.storeConversationMemory('bot1', 'hello', 'user', {});

      expect(provider.add).toHaveBeenCalledTimes(1);
      const [, opts] = provider.add.mock.calls[0];
      expect(opts.metadata.botName).toBe('bot1');
      expect(opts.metadata.timestamp).toBeDefined();
    });
  });

  // =========================================================================
  // Multiple bots sharing same memory provider
  // =========================================================================

  describe('multiple bots sharing same memory provider', () => {
    it('concurrent stores from different bots share the same provider instance', async () => {
      const mgr = freshManager();
      const sharedProvider = makeProvider();

      mockGetBot.mockImplementation((name: string) => ({
        name,
        memoryProfile: 'shared',
      }));
      mockGetMemoryProfileByKey.mockReturnValue({ provider: 'mem0', config: {} });
      mockLoadPlugin.mockReturnValue({});
      mockInstantiateMemoryProvider.mockReturnValue(sharedProvider);

      await Promise.all([
        mgr.storeConversationMemory('bot1', 'from bot1', 'user'),
        mgr.storeConversationMemory('bot2', 'from bot2', 'user'),
        mgr.storeConversationMemory('bot3', 'from bot3', 'user'),
      ]);

      expect(sharedProvider.add).toHaveBeenCalledTimes(3);
      expect(mockInstantiateMemoryProvider).toHaveBeenCalledTimes(1);

      // Verify each call carried the correct agentId.
      const agentIds = sharedProvider.add.mock.calls.map((c: any[]) => c[1].agentId);
      expect(agentIds).toContain('bot1');
      expect(agentIds).toContain('bot2');
      expect(agentIds).toContain('bot3');
    });
  });

  // =========================================================================
  // Provider failure during concurrent operations
  // =========================================================================

  describe('provider failure during concurrent operations', () => {
    it('one search failure does not affect other concurrent searches', async () => {
      const mgr = freshManager();
      let callIdx = 0;
      const provider = makeProvider({
        search: jest.fn().mockImplementation(async (query: string) => {
          callIdx++;
          if (callIdx === 2) throw new Error('intermittent failure');
          return { results: [{ id: `r${callIdx}`, memory: `result for ${query}` }] };
        }),
      });

      mockGetBot.mockImplementation((name: string) => ({
        name,
        memoryProfile: 'prof1',
      }));
      mockGetMemoryProfileByKey.mockReturnValue({ provider: 'mem0', config: {} });
      mockLoadPlugin.mockReturnValue({});
      mockInstantiateMemoryProvider.mockReturnValue(provider);

      const [r1, r2, r3] = await Promise.all([
        mgr.retrieveRelevantMemories('bot1', 'q1'),
        mgr.retrieveRelevantMemories('bot2', 'q2'),
        mgr.retrieveRelevantMemories('bot3', 'q3'),
      ]);

      // The failing search returns empty array (graceful degradation), others succeed.
      expect(r1.length + r2.length + r3.length).toBe(2);
      expect(provider.search).toHaveBeenCalledTimes(3);
    });
  });

  // =========================================================================
  // Fire-and-forget store behavior verification
  // =========================================================================

  describe('fire-and-forget store behavior', () => {
    it('store completes asynchronously even when not awaited by caller', async () => {
      const mgr = freshManager();
      const addSpy = jest.fn().mockResolvedValue({ results: [] });
      const provider = makeProvider({ add: addSpy });
      wireBot('bot1', 'prof1', provider);

      // Fire without awaiting (simulating fire-and-forget).
      const promise = mgr.storeConversationMemory('bot1', 'fire and forget', 'user');

      // At this point the store may not have completed yet.
      // Await to ensure it finishes.
      await promise;
      expect(addSpy).toHaveBeenCalledTimes(1);
      expect(addSpy.mock.calls[0][0]).toEqual([{ role: 'user', content: 'fire and forget' }]);
    });

    it('failed fire-and-forget store does not throw to the caller', async () => {
      const mgr = freshManager();
      const provider = makeProvider({
        add: jest.fn().mockRejectedValue(new Error('fire-and-forget failure')),
      });
      wireBot('bot1', 'prof1', provider);

      // Should not throw.
      await expect(
        mgr.storeConversationMemory('bot1', 'will fail', 'user')
      ).resolves.toBeUndefined();
    });
  });

  // =========================================================================
  // formatMemoriesForPrompt edge cases
  // =========================================================================

  describe('formatMemoriesForPrompt — edge cases', () => {
    it('handles memories with empty strings', () => {
      const mgr = freshManager();
      const memories: MemorySearchResult[] = [
        { id: '1', memory: '' },
        { id: '2', memory: 'valid' },
      ];
      const result = mgr.formatMemoriesForPrompt(memories);
      expect(result).toContain('- ');
      expect(result).toContain('- valid');
    });

    it('handles memories with special characters', () => {
      const mgr = freshManager();
      const memories: MemorySearchResult[] = [
        { id: '1', memory: 'User said "hello" & <goodbye>' },
        { id: '2', memory: '\u{1F600} emoji memory \u{1F680}' },
        { id: '3', memory: 'line\nbreak\ttab' },
      ];
      const result = mgr.formatMemoriesForPrompt(memories);
      expect(result).toContain('User said "hello" & <goodbye>');
      expect(result).toContain('\u{1F600} emoji memory \u{1F680}');
    });

    it('handles a large number of memories', () => {
      const mgr = freshManager();
      const memories: MemorySearchResult[] = Array.from({ length: 100 }, (_, i) => ({
        id: `m${i}`,
        memory: `Memory number ${i}`,
      }));
      const result = mgr.formatMemoriesForPrompt(memories);
      expect(result).toContain('Memory number 0');
      expect(result).toContain('Memory number 99');
      expect(result.split('\n').length).toBe(101); // header + 100 entries
    });
  });
});
