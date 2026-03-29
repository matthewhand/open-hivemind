/**
 * Contract tests for IMemoryProvider implementations.
 *
 * Tests verify providers conform to the IMemoryProvider interface defined in
 * packages/shared-types/src/IMemoryProvider.ts. HTTP calls are mocked so
 * tests run offline.
 */

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock global fetch for Mem0Provider which uses native fetch
const mockFetch = jest.fn();
global.fetch = mockFetch as any;

jest.mock('debug', () => {
  const noop: any = () => {};
  noop.extend = () => noop;
  return () => noop;
});

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------

import type { IMemoryProvider, MemoryEntry } from '@hivemind/shared-types/IMemoryProvider';
import { Mem0Provider } from '../../packages/memory-mem0/src/Mem0Provider';
import { Mem4aiProvider } from '../../packages/memory-mem4ai/src/Mem4aiProvider';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockResponse(body: any, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: jest.fn().mockResolvedValue(body),
    text: jest.fn().mockResolvedValue(JSON.stringify(body)),
    headers: new Headers(),
    redirected: false,
    type: 'basic',
    url: '',
    clone: jest.fn(),
    body: null,
    bodyUsed: false,
    arrayBuffer: jest.fn(),
    blob: jest.fn(),
    formData: jest.fn(),
    bytes: jest.fn(),
  } as unknown as Response;
}

// ---------------------------------------------------------------------------
// Contract test factory
// ---------------------------------------------------------------------------

/**
 * Runs IMemoryProvider contract tests against a concrete provider.
 * The provider constructor/factory is passed in; HTTP mocks are set up here.
 */
function runMemoryProviderContractTests(
  providerName: string,
  getProvider: () => any, // Using any to handle both interface shapes (shared-types and IProvider)
) {
  describe(`IMemoryProvider contract: ${providerName}`, () => {
    let provider: any;

    beforeEach(() => {
      jest.clearAllMocks();
      provider = getProvider();
    });

    // ----- addMemory / add -----------------------------------------------

    it('has an add or addMemory method', () => {
      const hasAdd = typeof provider.add === 'function';
      const hasAddMemory = typeof provider.addMemory === 'function';
      expect(hasAdd || hasAddMemory).toBe(true);
    });

    it('add/addMemory returns a Promise', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          results: [{ id: 'mem-1', memory: 'test memory', score: 0.9 }],
        }),
      );

      let result: any;
      if (typeof provider.addMemory === 'function') {
        result = provider.addMemory('test memory', {}, 'user-1');
      } else {
        result = provider.add(
          [{ role: 'user', content: 'test memory' }],
          { userId: 'user-1' },
        );
      }
      expect(result).toBeDefined();
      expect(typeof result.then).toBe('function');
      await result;
    });

    // ----- searchMemories / search ----------------------------------------

    it('has a search or searchMemories method', () => {
      const hasSearch = typeof provider.search === 'function';
      const hasSearchMemories = typeof provider.searchMemories === 'function';
      expect(hasSearch || hasSearchMemories).toBe(true);
    });

    it('search/searchMemories returns results', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          results: [{ id: 'mem-1', memory: 'relevant memory', score: 0.85 }],
        }),
      );

      let result: any;
      if (typeof provider.searchMemories === 'function') {
        result = await provider.searchMemories('test query', 10, 'user-1');
      } else {
        result = await provider.search('test query', { userId: 'user-1', limit: 10 });
      }

      expect(result).toBeDefined();
      // Both interfaces return results in some form
      const results = Array.isArray(result) ? result : result.results;
      expect(Array.isArray(results)).toBe(true);
    });

    // ----- getMemories / getAll ------------------------------------------

    it('has a getAll or getMemories method', () => {
      const hasGetAll = typeof provider.getAll === 'function';
      const hasGetMemories = typeof provider.getMemories === 'function';
      expect(hasGetAll || hasGetMemories).toBe(true);
    });

    it('getAll/getMemories returns a list of memories', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          results: [
            { id: 'mem-1', memory: 'memory one' },
            { id: 'mem-2', memory: 'memory two' },
          ],
        }),
      );

      let result: any;
      if (typeof provider.getMemories === 'function') {
        result = await provider.getMemories(10, 'user-1');
      } else {
        result = await provider.getAll({ userId: 'user-1' });
      }

      expect(result).toBeDefined();
      const results = Array.isArray(result) ? result : result.results;
      expect(Array.isArray(results)).toBe(true);
    });

    // ----- deleteMemory / delete -----------------------------------------

    it('has a delete or deleteMemory method', () => {
      const hasDelete = typeof provider.delete === 'function';
      const hasDeleteMemory = typeof provider.deleteMemory === 'function';
      expect(hasDelete || hasDeleteMemory).toBe(true);
    });

    it('delete/deleteMemory completes without error', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse(undefined, 204),
      );

      if (typeof provider.deleteMemory === 'function') {
        await expect(provider.deleteMemory('mem-1')).resolves.not.toThrow();
      } else {
        await expect(provider.delete('mem-1')).resolves.not.toThrow();
      }
    });

    // ----- updateMemory / update -----------------------------------------

    it('has an update or updateMemory method', () => {
      const hasUpdate = typeof provider.update === 'function';
      const hasUpdateMemory = typeof provider.updateMemory === 'function';
      expect(hasUpdate || hasUpdateMemory).toBe(true);
    });

    it('update/updateMemory returns the updated entry', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ id: 'mem-1', memory: 'updated memory' }),
      );

      let result: any;
      if (typeof provider.updateMemory === 'function') {
        result = await provider.updateMemory('mem-1', 'updated memory');
      } else {
        result = await provider.update('mem-1', 'updated memory');
      }

      expect(result).toBeDefined();
      expect(result).toHaveProperty('id');
      // Providers may use 'content' (Mem0) or 'memory' (Mem4ai) for the text field
      const hasTextField = result.hasOwnProperty('content') || result.hasOwnProperty('memory');
      expect(hasTextField).toBe(true);
    });

    // ----- healthCheck ---------------------------------------------------

    it('has a healthCheck method returning a status object', async () => {
      expect(typeof provider.healthCheck).toBe('function');

      mockFetch.mockResolvedValueOnce(
        createMockResponse({ results: [] }),
      );

      const result = await provider.healthCheck();
      expect(result).toHaveProperty('status');
      expect(['ok', 'error']).toContain(result.status);
    });

    it('healthCheck returns { status: "ok" } when backend is reachable', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ results: [] }),
      );
      const result = await provider.healthCheck();
      expect(result).toEqual({ status: 'ok' });
    });

    it('healthCheck returns { status: "error" } when backend is unreachable', async () => {
      mockFetch.mockRejectedValue(new Error('ECONNREFUSED'));
      const result = await provider.healthCheck();
      expect(result.status).toBe('error');
      expect(result.details).toBeDefined();
    });

    // ----- Error handling ------------------------------------------------

    it('search/searchMemories rejects on API error', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ error: 'unauthorized' }, 401),
      );

      const searchFn = typeof provider.searchMemories === 'function'
        ? () => provider.searchMemories('query', 10, 'user-1')
        : () => provider.search('query', { userId: 'user-1' });

      await expect(searchFn()).rejects.toThrow();
    });

    it('add/addMemory rejects on API error', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ error: 'bad request' }, 400),
      );

      const addFn = typeof provider.addMemory === 'function'
        ? () => provider.addMemory('content', {}, 'user-1')
        : () => provider.add([{ role: 'user', content: 'test' }], { userId: 'user-1' });

      await expect(addFn()).rejects.toThrow();
    });
  });
}

// ---------------------------------------------------------------------------
// Run contract tests
// ---------------------------------------------------------------------------

runMemoryProviderContractTests('Mem0Provider', () => {
  return new Mem0Provider({
    apiKey: 'test-api-key',
    baseUrl: 'https://api.mem0.test/v1',
    userId: 'test-user',
  });
});

runMemoryProviderContractTests('Mem4aiProvider', () => {
  return new Mem4aiProvider({
    apiKey: 'test-api-key',
    apiUrl: 'https://api.mem4ai.test/v1',
    userId: 'test-user',
  });
});
