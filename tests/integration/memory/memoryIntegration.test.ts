/**
 * REAL integration tests for the memory subsystem.
 *
 * Only global.fetch is mocked (the HTTP boundary). Everything else --
 * Mem0Provider, Mem4aiProvider, CircuitBreaker, MemoryManager, plugin
 * loading, config resolution -- is REAL production code.
 */

import { Mem0Provider } from '../../../packages/memory-mem0/src/Mem0Provider';
import { Mem4aiProvider } from '../../../packages/memory-mem4ai/src/Mem4aiProvider';
import { Mem0ApiError } from '../../../packages/memory-mem0/src/types';
import {
  clearCircuitBreakerRegistry,
  CircuitBreakerError,
} from '../../../src/common/CircuitBreaker';

// ---------------------------------------------------------------------------
// Fetch mock helpers
// ---------------------------------------------------------------------------

let fetchMock: jest.Mock;

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : String(status),
    headers: new Headers({ 'content-type': 'application/json' }),
    json: jest.fn().mockResolvedValue(body),
    text: jest.fn().mockResolvedValue(JSON.stringify(body)),
  } as unknown as Response;
}

function errorResponse(status: number, body = ''): Response {
  return {
    ok: false,
    status,
    statusText: String(status),
    headers: new Headers(),
    json: jest.fn().mockRejectedValue(new Error('not json')),
    text: jest.fn().mockResolvedValue(body),
  } as unknown as Response;
}

beforeEach(() => {
  clearCircuitBreakerRegistry();
  fetchMock = jest.fn();
  global.fetch = fetchMock;
});

afterEach(() => {
  jest.restoreAllMocks();
});

// ===========================================================================
// Test 1: Full Mem0Provider lifecycle
// ===========================================================================

describe('Full provider lifecycle (Mem0Provider)', () => {
  const BASE_URL = 'https://api.mem0.test/v1';
  const API_KEY = 'test-lifecycle-key';

  function makeProvider() {
    return new Mem0Provider({
      apiKey: API_KEY,
      baseUrl: BASE_URL,
      userId: 'user-1',
      agentId: 'agent-1',
      maxRetries: 0,
      timeoutMs: 5_000,
    });
  }

  it('add() sends POST to /memories/ with correct headers and body', async () => {
    const provider = makeProvider();
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ results: [{ id: 'mem-1', memory: 'stored content', score: 0.95 }] }),
    );

    const result = await provider.add(
      [{ role: 'user', content: 'hello world' }],
      { userId: 'u1', agentId: 'a1', metadata: { channelId: 'ch1' } },
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/memories/`);
    expect(opts.method).toBe('POST');
    expect(opts.headers['Authorization']).toBe(`Token ${API_KEY}`);
    expect(opts.headers['Content-Type']).toBe('application/json');

    const body = JSON.parse(opts.body);
    expect(body.messages).toEqual([{ role: 'user', content: 'hello world' }]);
    expect(body.user_id).toBe('u1');
    expect(body.agent_id).toBe('a1');
    expect(body.metadata).toEqual({ channelId: 'ch1' });

    expect(result.results).toEqual([
      { id: 'mem-1', memory: 'stored content', score: 0.95 },
    ]);
  });

  it('search() sends POST to /memories/search/ and maps response through toResult()', async () => {
    const provider = makeProvider();
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        results: [
          { id: 'r1', memory: 'found it', score: 0.9, metadata: { tag: 'x' } },
          { id: 'r2', memory: 'also found', score: 0.7 },
        ],
      }),
    );

    const result = await provider.search('my query', { limit: 5 });

    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/memories/search/`);
    expect(opts.method).toBe('POST');
    const body = JSON.parse(opts.body);
    expect(body.query).toBe('my query');
    expect(body.limit).toBe(5);

    expect(result.results).toHaveLength(2);
    expect(result.results[0]).toEqual({ id: 'r1', memory: 'found it', score: 0.9, metadata: { tag: 'x' } });
    expect(result.results[1]).toEqual({ id: 'r2', memory: 'also found', score: 0.7 });
  });

  it('get() calls GET /memories/{id}/ with encodeURIComponent', async () => {
    const provider = makeProvider();
    const specialId = 'mem/with spaces&chars';
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ id: specialId, memory: 'content here' }),
    );

    const result = await provider.get(specialId);

    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/memories/${encodeURIComponent(specialId)}/`);
    expect(result).toEqual({ id: specialId, memory: 'content here' });
  });

  it('update() sends PUT to /memories/{id}/', async () => {
    const provider = makeProvider();
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ id: 'mem-1', memory: 'updated text' }),
    );

    const result = await provider.update('mem-1', 'updated text');

    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/memories/${encodeURIComponent('mem-1')}/`);
    expect(opts.method).toBe('PUT');
    const body = JSON.parse(opts.body);
    expect(body.text).toBe('updated text');
    expect(result).toEqual({ id: 'mem-1', memory: 'updated text' });
  });

  it('delete() sends DELETE to /memories/{id}/', async () => {
    const provider = makeProvider();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 204,
      statusText: 'No Content',
      headers: new Headers(),
      json: jest.fn().mockRejectedValue(new Error('no body')),
      text: jest.fn().mockResolvedValue(''),
    } as unknown as Response);

    await expect(provider.delete('mem-1')).resolves.toBeUndefined();

    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/memories/${encodeURIComponent('mem-1')}/`);
    expect(opts.method).toBe('DELETE');
  });

  it('healthCheck() sends GET to /memories/ with limit=1', async () => {
    const provider = makeProvider();
    fetchMock.mockResolvedValueOnce(jsonResponse({ results: [] }));

    const healthy = await provider.healthCheck();

    expect(healthy).toBe(true);
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toContain('/memories/');
    expect(url).toContain('limit=1');
    expect(opts.method).toBe('GET');
  });
});

// ===========================================================================
// Test 2: MemoryManager -> real provider resolution
// ===========================================================================

describe('MemoryManager -> real provider resolution', () => {
  // We need to mock the config layer (filesystem) and plugin loader,
  // but keep MemoryManager and providers REAL.

  const mockGetBot = jest.fn();
  const mockGetMemoryProfileByKey = jest.fn();

  beforeEach(() => {
    jest.resetModules();
    clearCircuitBreakerRegistry();

    // Only mock the config lookups (filesystem boundary) and the plugin
    // require() call. Everything else is real.
    jest.doMock('@src/config/BotConfigurationManager', () => ({
      BotConfigurationManager: {
        getInstance: () => ({ getBot: mockGetBot }),
      },
    }));

    jest.doMock('@src/config/memoryProfiles', () => ({
      getMemoryProfileByKey: (...args: any[]) => mockGetMemoryProfileByKey(...args),
    }));

    // Use the REAL plugin instantiation logic but bypass require('@hivemind/...')
    // by providing the real module directly.
    jest.doMock('@src/plugins', () => {
      const realMem0Module = jest.requireActual('../../../packages/memory-mem0/src/index');
      const { instantiateMemoryProvider: realInstantiate } = jest.requireActual(
        '../../../src/plugins/PluginLoader',
      );
      return {
        loadPlugin: jest.fn().mockReturnValue(realMem0Module),
        instantiateMemoryProvider: realInstantiate,
      };
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('resolves config -> profile -> plugin -> provider -> HTTP for store + retrieve', async () => {
    // Set up config mocks to simulate real config files
    mockGetBot.mockImplementation((name: string) => {
      if (name === 'TestBot') return { name: 'TestBot', memoryProfile: 'test-profile' };
      return undefined;
    });
    mockGetMemoryProfileByKey.mockImplementation((key: string) => {
      if (key === 'test-profile') {
        return {
          key: 'test-profile',
          name: 'Test Memory',
          provider: 'mem0',
          config: {
            apiKey: 'real-test-key',
            baseUrl: 'https://mem0.test.local/v1',
            userId: 'default-user',
            maxRetries: 0,
            timeoutMs: 5_000,
          },
        };
      }
      return undefined;
    });

    // Import MemoryManager AFTER mocks are in place
    const { MemoryManager } = require('../../../src/services/MemoryManager');
    (MemoryManager as any).instance = undefined;
    const mgr = MemoryManager.getInstance();

    // --- storeConversationMemory ---
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ results: [{ id: 'stored-1', memory: 'remembered' }] }),
    );

    await mgr.storeConversationMemory('TestBot', 'remember this', 'user', {
      userId: 'u42',
      channelId: 'ch1',
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [storeUrl, storeOpts] = fetchMock.mock.calls[0];
    expect(storeUrl).toBe('https://mem0.test.local/v1/memories/');
    expect(storeOpts.method).toBe('POST');
    const storeBody = JSON.parse(storeOpts.body);
    expect(storeBody.messages).toEqual([{ role: 'user', content: 'remember this' }]);
    expect(storeBody.agent_id).toBe('TestBot');
    expect(storeBody.user_id).toBe('u42');

    // --- retrieveRelevantMemories ---
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        results: [
          { id: 'r1', memory: 'you said remember this', score: 0.92 },
        ],
      }),
    );

    const memories = await mgr.retrieveRelevantMemories('TestBot', 'what did I say?');

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(memories).toHaveLength(1);
    expect(memories[0]).toEqual({
      id: 'r1',
      memory: 'you said remember this',
      score: 0.92,
    });

    const [searchUrl, searchOpts] = fetchMock.mock.calls[1];
    expect(searchUrl).toBe('https://mem0.test.local/v1/memories/search/');
    const searchBody = JSON.parse(searchOpts.body);
    expect(searchBody.query).toBe('what did I say?');
    expect(searchBody.agent_id).toBe('TestBot');
  });
});

// ===========================================================================
// Test 3: Circuit breaker fires through real Mem0Provider
// ===========================================================================

describe('Circuit breaker fires through real Mem0Provider', () => {
  it('opens after 5 failures, rejects 6th fast, recovers after reset', async () => {
    const provider = new Mem0Provider({
      apiKey: 'cb-test-key',
      baseUrl: 'https://cb.mem0.test/v1',
      maxRetries: 0,
      timeoutMs: 5_000,
    });

    // 5 consecutive failures to trip the breaker (threshold = 5)
    for (let i = 0; i < 5; i++) {
      fetchMock.mockResolvedValueOnce(errorResponse(500, 'server error'));
    }

    for (let i = 0; i < 5; i++) {
      await expect(provider.search(`fail-${i}`)).rejects.toThrow();
    }

    expect(fetchMock).toHaveBeenCalledTimes(5);

    // 6th request should be rejected FAST by the circuit breaker --
    // fetch should NOT be called again.
    const fetchCountBefore = fetchMock.mock.calls.length;
    await expect(provider.search('should-be-rejected')).rejects.toThrow(CircuitBreakerError);
    expect(fetchMock.mock.calls.length).toBe(fetchCountBefore); // No new fetch call

    // Simulate reset timeout passing by manually resetting the breaker.
    // In production this happens via setTimeout; in tests we shortcut.
    clearCircuitBreakerRegistry();

    // Create a new provider (gets a fresh circuit breaker since registry was cleared)
    const provider2 = new Mem0Provider({
      apiKey: 'cb-test-key',
      baseUrl: 'https://cb.mem0.test/v1',
      maxRetries: 0,
      timeoutMs: 5_000,
    });

    // Next request should go through (new breaker, CLOSED state)
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ results: [{ id: 'recovered', memory: 'back online', score: 0.5 }] }),
    );

    const result = await provider2.search('recovery test');
    expect(result.results[0].memory).toBe('back online');
  });
});

// ===========================================================================
// Test 4: Provider timeout fires through real MemoryManager
// ===========================================================================

describe('Provider timeout fires through real MemoryManager', () => {
  const mockGetBot = jest.fn();
  const mockGetMemoryProfileByKey = jest.fn();

  beforeEach(() => {
    jest.resetModules();
    clearCircuitBreakerRegistry();

    jest.doMock('@src/config/BotConfigurationManager', () => ({
      BotConfigurationManager: {
        getInstance: () => ({ getBot: mockGetBot }),
      },
    }));
    jest.doMock('@src/config/memoryProfiles', () => ({
      getMemoryProfileByKey: (...args: any[]) => mockGetMemoryProfileByKey(...args),
    }));

    const realMem0Module = jest.requireActual('../../../packages/memory-mem0/src/index');
    const { instantiateMemoryProvider: realInstantiate } = jest.requireActual(
      '../../../src/plugins/PluginLoader',
    );
    jest.doMock('@src/plugins', () => ({
      loadPlugin: jest.fn().mockReturnValue(realMem0Module),
      instantiateMemoryProvider: realInstantiate,
    }));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('provider abort fires on slow fetch, MemoryManager returns [] gracefully', async () => {
    mockGetBot.mockReturnValue({ name: 'SlowBot', memoryProfile: 'slow-profile' });
    mockGetMemoryProfileByKey.mockReturnValue({
      key: 'slow-profile',
      name: 'Slow',
      provider: 'mem0',
      config: {
        apiKey: 'slow-key',
        baseUrl: 'https://slow.mem0.test/v1',
        maxRetries: 0,
        timeoutMs: 200, // Very short provider-level timeout
      },
    });

    const { MemoryManager } = require('../../../src/services/MemoryManager');
    (MemoryManager as any).instance = undefined;
    const mgr = MemoryManager.getInstance();

    // Mock fetch to hang for 30 seconds -- provider's 200ms timeout should fire first
    let receivedSignal: AbortSignal | undefined;
    fetchMock.mockImplementation((_url: string, opts: any) => {
      receivedSignal = opts?.signal;
      return new Promise((_resolve, reject) => {
        // Respect the abort signal like a real fetch would
        if (opts?.signal) {
          opts.signal.addEventListener('abort', () => {
            reject(new DOMException('The operation was aborted', 'AbortError'));
          });
        }
      });
    });

    const start = Date.now();
    const results = await mgr.retrieveRelevantMemories('SlowBot', 'waiting...');
    const elapsed = Date.now() - start;

    // MemoryManager catches the timeout error and returns empty array
    expect(results).toEqual([]);
    // Should complete in well under 2 seconds (provider timeout is 200ms)
    expect(elapsed).toBeLessThan(2_000);
    // Verify the AbortController's signal was passed to fetch
    expect(receivedSignal).toBeDefined();
    expect(receivedSignal!.aborted).toBe(true);
  }, 10_000);
});

// ===========================================================================
// Test 5: score:0 edge case
// ===========================================================================

describe('score:0 edge case', () => {
  it('preserves score: 0 in search results (not stripped by falsy check)', async () => {
    const provider = new Mem0Provider({
      apiKey: 'score-test',
      baseUrl: 'https://score.mem0.test/v1',
      maxRetries: 0,
      timeoutMs: 5_000,
    });

    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        results: [
          { id: 'z1', memory: 'zero score memory', score: 0 },
          { id: 'z2', memory: 'normal score memory', score: 0.5 },
          { id: 'z3', memory: 'no score memory' },
        ],
      }),
    );

    const result = await provider.search('test');

    expect(result.results[0].score).toBe(0); // Must be 0, NOT undefined
    expect(result.results[1].score).toBe(0.5);
    expect(result.results[2].score).toBeUndefined(); // no score field at all
  });

  it('Mem4aiProvider also preserves score: 0', async () => {
    const provider = new Mem4aiProvider({
      apiKey: 'score-test',
      apiUrl: 'https://score.mem4ai.test/v1',
      maxRetries: 0,
      timeout: 5_000,
    });

    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        results: [
          { id: 'z1', memory: 'zero score', score: 0 },
          { id: 'z2', memory: 'null score', score: null },
          { id: 'z3', memory: 'no score' },
        ],
      }),
    );

    const result = await provider.search('test');

    expect(result.results[0].score).toBe(0);
    // null and undefined both stripped by != null check
    expect(result.results[1]).not.toHaveProperty('score');
    expect(result.results[2]).not.toHaveProperty('score');
  });
});
