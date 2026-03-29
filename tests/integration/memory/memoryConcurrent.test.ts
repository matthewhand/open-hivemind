/**
 * Integration tests for concurrent memory operations through the
 * MemoryManager pipeline.
 *
 * Covers: simultaneous messages to same bot, interleaved search+store,
 * provider failure mid-batch, and fire-and-forget store completion.
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

function wireBot(botName: string, profileKey: string, provider: ReturnType<typeof makeProvider>) {
  mockGetBot.mockImplementation((name: string) => {
    if (name === botName) return { name: botName, memoryProfile: profileKey };
    // Allow fallback for multi-bot tests.
    return { name, memoryProfile: profileKey };
  });
  mockGetMemoryProfileByKey.mockImplementation((key: string) => {
    if (key === profileKey) return { provider: 'mem0', config: {} };
    return undefined;
  });
  mockLoadPlugin.mockReturnValue({});
  mockInstantiateMemoryProvider.mockReturnValue(provider);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Memory concurrent integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // 10 simultaneous messages to same bot, all with memory enabled
  // =========================================================================

  describe('10 simultaneous messages to same bot', () => {
    it('all 10 stores complete without interference', async () => {
      const mgr = freshManager();
      const storedMessages: string[] = [];
      const provider = makeProvider({
        add: jest.fn().mockImplementation(async (msgs: any[]) => {
          // Simulate small async delay to increase interleaving.
          await new Promise((r) => setTimeout(r, Math.random() * 10));
          storedMessages.push(msgs[0].content);
          return { results: [{ id: `m-${storedMessages.length}`, memory: msgs[0].content }] };
        }),
      });
      wireBot('testBot', 'prof1', provider);

      const storePromises = Array.from({ length: 10 }, (_, i) =>
        mgr.storeConversationMemory('testBot', `message-${i}`, 'user', { userId: `u${i}` }),
      );

      await Promise.all(storePromises);

      expect(provider.add).toHaveBeenCalledTimes(10);
      expect(storedMessages).toHaveLength(10);
      for (let i = 0; i < 10; i++) {
        expect(storedMessages).toContain(`message-${i}`);
      }
    });

    it('all 10 searches return independently', async () => {
      const mgr = freshManager();
      let searchCount = 0;
      const provider = makeProvider({
        search: jest.fn().mockImplementation(async (query: string) => {
          searchCount++;
          await new Promise((r) => setTimeout(r, Math.random() * 10));
          return { results: [{ id: `s-${searchCount}`, memory: `result for ${query}`, score: 0.9 }] };
        }),
      });
      wireBot('testBot', 'prof1', provider);

      const searchPromises = Array.from({ length: 10 }, (_, i) =>
        mgr.retrieveRelevantMemories('testBot', `query-${i}`),
      );

      const allResults = await Promise.all(searchPromises);

      expect(provider.search).toHaveBeenCalledTimes(10);
      allResults.forEach((results) => {
        expect(results).toHaveLength(1);
        expect(results[0].memory).toMatch(/^result for query-\d+$/);
      });
    });

    it('mixed store and search on same bot complete without deadlock', async () => {
      const mgr = freshManager();
      const provider = makeProvider({
        add: jest.fn().mockImplementation(async () => {
          await new Promise((r) => setTimeout(r, Math.random() * 5));
          return { results: [] };
        }),
        search: jest.fn().mockImplementation(async (query: string) => {
          await new Promise((r) => setTimeout(r, Math.random() * 5));
          return { results: [{ id: 'r1', memory: query, score: 0.5 }] };
        }),
      });
      wireBot('testBot', 'prof1', provider);

      const ops = Array.from({ length: 10 }, (_, i) => {
        if (i % 2 === 0) {
          return mgr.storeConversationMemory('testBot', `store-${i}`, 'user');
        }
        return mgr.retrieveRelevantMemories('testBot', `search-${i}`);
      });

      const results = await Promise.all(ops);

      // 5 stores (return undefined) and 5 searches (return arrays).
      const stores = results.filter((r) => r === undefined);
      const searches = results.filter((r) => Array.isArray(r));
      expect(stores).toHaveLength(5);
      expect(searches).toHaveLength(5);
      expect(provider.add).toHaveBeenCalledTimes(5);
      expect(provider.search).toHaveBeenCalledTimes(5);
    });
  });

  // =========================================================================
  // Memory search + store interleaved
  // =========================================================================

  describe('memory search + store interleaved', () => {
    it('search completes while store is still pending', async () => {
      const mgr = freshManager();
      let storeResolve: (() => void) | undefined;
      const storeGate = new Promise<void>((r) => { storeResolve = r; });

      const provider = makeProvider({
        add: jest.fn().mockImplementation(() => storeGate.then(() => ({ results: [] }))),
        search: jest.fn().mockResolvedValue({
          results: [{ id: 'fast', memory: 'quick result', score: 0.95 }],
        }),
      });
      wireBot('testBot', 'prof1', provider);

      // Start store first (it will be blocked).
      const storeTask = mgr.storeConversationMemory('testBot', 'slow message', 'user');

      // Search should resolve immediately.
      const searchResults = await mgr.retrieveRelevantMemories('testBot', 'fast query');
      expect(searchResults).toHaveLength(1);
      expect(searchResults[0].memory).toBe('quick result');

      // Store should still be pending. Unblock it now.
      storeResolve!();
      await storeTask;

      expect(provider.add).toHaveBeenCalledTimes(1);
      expect(provider.search).toHaveBeenCalledTimes(1);
    });
  });

  // =========================================================================
  // Provider failure mid-batch (some succeed, some fail)
  // =========================================================================

  describe('provider failure mid-batch', () => {
    it('some stores succeed while others fail — no cascading failure', async () => {
      const mgr = freshManager();
      let callIdx = 0;
      const successfulStores: string[] = [];

      const provider = makeProvider({
        add: jest.fn().mockImplementation(async (msgs: any[]) => {
          callIdx++;
          const content = msgs[0].content;
          // Fail every third call.
          if (callIdx % 3 === 0) {
            throw new Error(`store failure at call ${callIdx}`);
          }
          successfulStores.push(content);
          return { results: [{ id: `ok-${callIdx}`, memory: content }] };
        }),
      });
      wireBot('testBot', 'prof1', provider);

      const promises = Array.from({ length: 9 }, (_, i) =>
        mgr.storeConversationMemory('testBot', `msg-${i}`, 'user'),
      );

      // All should resolve (failures are swallowed by MemoryManager).
      await Promise.all(promises);

      expect(provider.add).toHaveBeenCalledTimes(9);
      // 3 failures out of 9: calls 3, 6, 9 fail.
      expect(successfulStores).toHaveLength(6);
    });

    it('some searches succeed while others fail — failures return empty arrays', async () => {
      const mgr = freshManager();
      let callIdx = 0;

      const provider = makeProvider({
        search: jest.fn().mockImplementation(async (query: string) => {
          callIdx++;
          if (callIdx % 2 === 0) {
            throw new Error('search timeout');
          }
          return { results: [{ id: `r-${callIdx}`, memory: query, score: 0.8 }] };
        }),
      });
      wireBot('testBot', 'prof1', provider);

      const promises = Array.from({ length: 6 }, (_, i) =>
        mgr.retrieveRelevantMemories('testBot', `query-${i}`),
      );

      const allResults = await Promise.all(promises);

      // 3 succeed (odd calls), 3 fail (even calls -> empty array).
      const successes = allResults.filter((r) => r.length > 0);
      const failures = allResults.filter((r) => r.length === 0);
      expect(successes).toHaveLength(3);
      expect(failures).toHaveLength(3);
    });

    it('mixed store failures and search failures are independent', async () => {
      const mgr = freshManager();
      const provider = makeProvider({
        add: jest.fn()
          .mockResolvedValueOnce({ results: [] })
          .mockRejectedValueOnce(new Error('store fail'))
          .mockResolvedValueOnce({ results: [] }),
        search: jest.fn()
          .mockRejectedValueOnce(new Error('search fail'))
          .mockResolvedValueOnce({ results: [{ id: 's1', memory: 'ok', score: 0.9 }] })
          .mockResolvedValueOnce({ results: [{ id: 's2', memory: 'ok2', score: 0.8 }] }),
      });
      wireBot('testBot', 'prof1', provider);

      const ops = await Promise.all([
        mgr.storeConversationMemory('testBot', 'store1', 'user'),
        mgr.retrieveRelevantMemories('testBot', 'search1'),
        mgr.storeConversationMemory('testBot', 'store2', 'user'),
        mgr.retrieveRelevantMemories('testBot', 'search2'),
        mgr.storeConversationMemory('testBot', 'store3', 'user'),
        mgr.retrieveRelevantMemories('testBot', 'search3'),
      ]);

      // All promises should resolve (no rejections).
      expect(ops).toHaveLength(6);
      expect(provider.add).toHaveBeenCalledTimes(3);
      expect(provider.search).toHaveBeenCalledTimes(3);
    });
  });

  // =========================================================================
  // Fire-and-forget stores actually complete (spy + flush)
  // =========================================================================

  describe('fire-and-forget store completion verification', () => {
    it('store promise resolves and provider.add is called with correct data', async () => {
      const mgr = freshManager();
      const addSpy = jest.fn().mockResolvedValue({ results: [{ id: 'ff1', memory: 'stored' }] });
      const provider = makeProvider({ add: addSpy });
      wireBot('testBot', 'prof1', provider);

      // Simulate fire-and-forget pattern: collect promise but do not await immediately.
      const storePromise = mgr.storeConversationMemory(
        'testBot',
        'fire-and-forget content',
        'user',
        { userId: 'u1', channelId: 'ch1' },
      );

      // Flush by awaiting.
      await storePromise;

      expect(addSpy).toHaveBeenCalledTimes(1);
      const [messages, opts] = addSpy.mock.calls[0];
      expect(messages).toEqual([{ role: 'user', content: 'fire-and-forget content' }]);
      expect(opts.agentId).toBe('testBot');
      expect(opts.userId).toBe('u1');
      expect(opts.metadata.channelId).toBe('ch1');
      expect(opts.metadata.timestamp).toBeDefined();
    });

    it('multiple fire-and-forget stores all eventually complete', async () => {
      const mgr = freshManager();
      const completionOrder: number[] = [];
      const addSpy = jest.fn().mockImplementation(async (msgs: any[]) => {
        const idx = parseInt(msgs[0].content.split('-')[1], 10);
        await new Promise((r) => setTimeout(r, Math.random() * 20));
        completionOrder.push(idx);
        return { results: [] };
      });
      const provider = makeProvider({ add: addSpy });
      wireBot('testBot', 'prof1', provider);

      // Fire all stores without awaiting individually.
      const promises = Array.from({ length: 5 }, (_, i) =>
        mgr.storeConversationMemory('testBot', `msg-${i}`, 'user'),
      );

      // Flush all.
      await Promise.all(promises);

      expect(addSpy).toHaveBeenCalledTimes(5);
      expect(completionOrder).toHaveLength(5);
      // All indices should be present regardless of order.
      expect(completionOrder.sort()).toEqual([0, 1, 2, 3, 4]);
    });

    it('fire-and-forget store failure is silently caught', async () => {
      const mgr = freshManager();
      const addSpy = jest.fn().mockRejectedValue(new Error('backend down'));
      const provider = makeProvider({ add: addSpy });
      wireBot('testBot', 'prof1', provider);

      // Should not throw.
      const promise = mgr.storeConversationMemory('testBot', 'will fail silently', 'user');
      await expect(promise).resolves.toBeUndefined();
      expect(addSpy).toHaveBeenCalledTimes(1);
    });
  });

  // =========================================================================
  // High-volume stress test
  // =========================================================================

  describe('high-volume concurrent operations', () => {
    it('50 concurrent operations (mixed store+search) complete without errors', async () => {
      const mgr = freshManager();
      const provider = makeProvider({
        add: jest.fn().mockImplementation(async () => {
          await new Promise((r) => setTimeout(r, Math.random() * 5));
          return { results: [] };
        }),
        search: jest.fn().mockImplementation(async () => {
          await new Promise((r) => setTimeout(r, Math.random() * 5));
          return { results: [{ id: 'r', memory: 'found', score: 0.5 }] };
        }),
      });
      wireBot('testBot', 'prof1', provider);

      const ops = Array.from({ length: 50 }, (_, i) => {
        if (i % 2 === 0) {
          return mgr.storeConversationMemory('testBot', `store-${i}`, 'user');
        }
        return mgr.retrieveRelevantMemories('testBot', `search-${i}`);
      });

      const results = await Promise.all(ops);
      expect(results).toHaveLength(50);
      expect(provider.add).toHaveBeenCalledTimes(25);
      expect(provider.search).toHaveBeenCalledTimes(25);
    });
  });
});
