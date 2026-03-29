/**
 * Edge-case tests for Mem0Provider.
 *
 * Covers: large payloads, special characters, empty/long inputs,
 * concurrent add+search, rate limiting (429), HTML error bodies,
 * connection errors (ECONNREFUSED), partial/truncated JSON,
 * and healthCheck integration.
 */

import { Mem0Provider } from '../../../packages/memory-mem0/src/Mem0Provider';
import { Mem0ApiError } from '../../../packages/memory-mem0/src/types';
import { clearCircuitBreakerRegistry } from '../../../src/common/CircuitBreaker';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TEST_API_KEY = 'test-key-edge';
const TEST_BASE_URL = 'https://edge.mem0.test/v1';

function makeProvider(overrides: Record<string, unknown> = {}): Mem0Provider {
  return new Mem0Provider({
    apiKey: TEST_API_KEY,
    baseUrl: TEST_BASE_URL,
    userId: 'user-edge',
    agentId: 'agent-edge',
    maxRetries: 0,
    timeoutMs: 5_000,
    ...overrides,
  });
}

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

function htmlErrorResponse(status: number, html: string): Response {
  return {
    ok: false,
    status,
    statusText: String(status),
    headers: new Headers({ 'content-type': 'text/html' }),
    json: jest.fn().mockRejectedValue(new SyntaxError('Unexpected token <')),
    text: jest.fn().mockResolvedValue(html),
  } as unknown as Response;
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

let fetchMock: jest.Mock;

beforeEach(() => {
  clearCircuitBreakerRegistry();
  fetchMock = jest.fn();
  global.fetch = fetchMock;
});

afterEach(() => {
  jest.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Large payload handling
// ---------------------------------------------------------------------------

describe('Mem0Provider — large payload handling', () => {
  it('handles 1MB content in add()', async () => {
    const provider = makeProvider();
    const largeContent = 'A'.repeat(1_000_000); // 1MB of ASCII
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ results: [{ id: 'big-1', memory: 'stored' }] }),
    );

    const result = await provider.add([{ role: 'user', content: largeContent }]);
    expect(result.results).toHaveLength(1);

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.messages[0].content).toHaveLength(1_000_000);
  });

  it('handles 1MB content in search response', async () => {
    const provider = makeProvider();
    const largeMemory = 'B'.repeat(1_000_000);
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ results: [{ id: 'big-s', memory: largeMemory, score: 0.5 }] }),
    );

    const result = await provider.search('test');
    expect(result.results[0].memory).toHaveLength(1_000_000);
  });

  it('handles many results in a single response', async () => {
    const provider = makeProvider();
    const manyResults = Array.from({ length: 500 }, (_, i) => ({
      id: `mem-${i}`,
      memory: `Memory item ${i}`,
      score: 1 - i * 0.001,
    }));
    fetchMock.mockResolvedValueOnce(jsonResponse({ results: manyResults }));

    const result = await provider.search('bulk query');
    expect(result.results).toHaveLength(500);
    expect(result.results[0].id).toBe('mem-0');
    expect(result.results[499].id).toBe('mem-499');
  });
});

// ---------------------------------------------------------------------------
// Special characters in memory content
// ---------------------------------------------------------------------------

describe('Mem0Provider — special characters', () => {
  it('handles unicode (emoji, CJK, RTL) in content', async () => {
    const provider = makeProvider();
    const unicodeContent = '\u{1F600}\u{1F680} \u4F60\u597D \u0645\u0631\u062D\u0628\u0627 \u00E9\u00E8\u00EA';
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ results: [{ id: 'u1', memory: unicodeContent }] }),
    );

    const result = await provider.add([{ role: 'user', content: unicodeContent }]);
    expect(result.results[0].memory).toBe(unicodeContent);

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.messages[0].content).toBe(unicodeContent);
  });

  it('handles null bytes in content', async () => {
    const provider = makeProvider();
    const contentWithNulls = 'before\x00middle\x00after';
    fetchMock.mockResolvedValueOnce(jsonResponse({ results: [] }));

    await provider.add([{ role: 'user', content: contentWithNulls }]);

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.messages[0].content).toBe(contentWithNulls);
  });

  it('handles JSON-special characters in content', async () => {
    const provider = makeProvider();
    const jsonSpecial = '{"key": "value"}\n\t\r\\/"';
    fetchMock.mockResolvedValueOnce(jsonResponse({ results: [] }));

    await provider.add([{ role: 'user', content: jsonSpecial }]);

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.messages[0].content).toBe(jsonSpecial);
  });
});

// ---------------------------------------------------------------------------
// Empty string queries
// ---------------------------------------------------------------------------

describe('Mem0Provider — empty/boundary inputs', () => {
  it('handles empty string in add() content', async () => {
    const provider = makeProvider();
    fetchMock.mockResolvedValueOnce(jsonResponse({ results: [] }));

    const result = await provider.add([{ role: 'user', content: '' }]);
    expect(result.results).toEqual([]);

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.messages[0].content).toBe('');
  });

  it('handles whitespace-only query in search()', async () => {
    const provider = makeProvider();
    fetchMock.mockResolvedValueOnce(jsonResponse({ results: [] }));

    const result = await provider.search('   \t\n  ');
    expect(result.results).toEqual([]);
  });

  it('handles zero limit in search()', async () => {
    const provider = makeProvider();
    fetchMock.mockResolvedValueOnce(jsonResponse({ results: [] }));

    await provider.search('q', { limit: 0 });
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.limit).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Very long memory IDs
// ---------------------------------------------------------------------------

describe('Mem0Provider — long memory IDs', () => {
  it('handles a very long memory ID in get()', async () => {
    const provider = makeProvider();
    const longId = 'x'.repeat(1000);
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ id: longId, memory: 'long-id-memory' }),
    );

    const result = await provider.get(longId);
    expect(result).toEqual({ id: longId, memory: 'long-id-memory' });

    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain(encodeURIComponent(longId));
  });

  it('handles a very long memory ID in update()', async () => {
    const provider = makeProvider();
    const longId = 'y'.repeat(1000);
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ id: longId, memory: 'updated' }),
    );

    const result = await provider.update(longId, 'updated');
    expect(result).toEqual({ id: longId, memory: 'updated' });
  });

  it('handles a very long memory ID in delete()', async () => {
    const provider = makeProvider();
    const longId = 'z'.repeat(1000);
    fetchMock.mockResolvedValueOnce({
      ok: true, status: 204, statusText: 'No Content',
      headers: new Headers(),
      json: jest.fn().mockRejectedValue(new Error('no body')),
      text: jest.fn().mockResolvedValue(''),
    } as unknown as Response);

    await expect(provider.delete(longId)).resolves.toBeUndefined();
  });

  it('handles memory ID with special characters', async () => {
    const provider = makeProvider();
    const specialId = 'mem/with spaces&special=chars?query#hash';
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ id: specialId, memory: 'special-id-memory' }),
    );

    const result = await provider.get(specialId);
    expect(result).toEqual({ id: specialId, memory: 'special-id-memory' });

    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain(encodeURIComponent(specialId));
  });
});

// ---------------------------------------------------------------------------
// Concurrent add + search on same provider instance
// ---------------------------------------------------------------------------

describe('Mem0Provider — concurrent add + search', () => {
  it('concurrent add and search do not interfere', async () => {
    const provider = makeProvider();

    fetchMock
      .mockResolvedValueOnce(jsonResponse({ results: [{ id: 'a1', memory: 'added' }] }))
      .mockResolvedValueOnce(jsonResponse({ results: [{ id: 's1', memory: 'found', score: 0.9 }] }));

    const [addResult, searchResult] = await Promise.all([
      provider.add([{ role: 'user', content: 'store this' }]),
      provider.search('find this'),
    ]);

    expect(addResult.results).toHaveLength(1);
    expect(addResult.results[0].memory).toBe('added');
    expect(searchResult.results).toHaveLength(1);
    expect(searchResult.results[0].memory).toBe('found');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('multiple concurrent searches return correct results', async () => {
    const provider = makeProvider();

    fetchMock
      .mockResolvedValueOnce(jsonResponse({ results: [{ id: '1', memory: 'first', score: 0.9 }] }))
      .mockResolvedValueOnce(jsonResponse({ results: [{ id: '2', memory: 'second', score: 0.8 }] }))
      .mockResolvedValueOnce(jsonResponse({ results: [{ id: '3', memory: 'third', score: 0.7 }] }));

    const [r1, r2, r3] = await Promise.all([
      provider.search('query1'),
      provider.search('query2'),
      provider.search('query3'),
    ]);

    expect(r1.results[0].id).toBe('1');
    expect(r2.results[0].id).toBe('2');
    expect(r3.results[0].id).toBe('3');
  });

  it('concurrent adds all complete successfully', async () => {
    const provider = makeProvider();

    for (let i = 0; i < 5; i++) {
      fetchMock.mockResolvedValueOnce(
        jsonResponse({ results: [{ id: `m${i}`, memory: `msg ${i}` }] }),
      );
    }

    const results = await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        provider.add([{ role: 'user', content: `message ${i}` }]),
      ),
    );

    expect(results).toHaveLength(5);
    results.forEach((r, i) => {
      expect(r.results[0].id).toBe(`m${i}`);
    });
    expect(fetchMock).toHaveBeenCalledTimes(5);
  });
});

// ---------------------------------------------------------------------------
// Rate limiting (429 responses)
// ---------------------------------------------------------------------------

describe('Mem0Provider — rate limiting (429)', () => {
  it('throws on 429 when maxRetries=0', async () => {
    const provider = makeProvider({ maxRetries: 0 });
    fetchMock.mockResolvedValueOnce(errorResponse(429, 'Rate limited'));

    await expect(provider.search('test')).rejects.toThrow(Mem0ApiError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('retries on 429 and succeeds on second attempt', async () => {
    const provider = makeProvider({ maxRetries: 1, timeoutMs: 15_000 });

    let callCount = 0;
    fetchMock.mockImplementation(async () => {
      callCount++;
      if (callCount === 1) return errorResponse(429, 'Too Many Requests');
      return jsonResponse({ results: [{ id: 'ok', memory: 'recovered' }] });
    });

    const result = await provider.search('test');
    expect(result.results[0].memory).toBe('recovered');
    expect(callCount).toBe(2);
  }, 15_000);

  it('exhausts retries on persistent 429', async () => {
    const provider = makeProvider({ maxRetries: 1, timeoutMs: 15_000 });
    fetchMock.mockImplementation(async () => errorResponse(429, 'Rate limited'));

    await expect(provider.search('test')).rejects.toThrow(Mem0ApiError);
    expect(fetchMock).toHaveBeenCalledTimes(2); // initial + 1 retry
  }, 15_000);
});

// ---------------------------------------------------------------------------
// Server returning HTML instead of JSON
// ---------------------------------------------------------------------------

describe('Mem0Provider — HTML error responses', () => {
  it('throws Mem0ApiError when server returns HTML 502', async () => {
    const provider = makeProvider();
    const html = '<html><body><h1>502 Bad Gateway</h1></body></html>';
    fetchMock.mockResolvedValueOnce(htmlErrorResponse(502, html));

    try {
      await provider.search('test');
      throw new Error('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(Mem0ApiError);
      expect((err as Mem0ApiError).status).toBe(502);
      expect((err as Mem0ApiError).body).toContain('502 Bad Gateway');
    }
  });

  it('throws Mem0ApiError when server returns HTML 503', async () => {
    const provider = makeProvider();
    const html = '<html><body>Service Unavailable</body></html>';
    fetchMock.mockResolvedValueOnce(htmlErrorResponse(503, html));

    await expect(provider.search('test')).rejects.toThrow(Mem0ApiError);
  });

  it('throws on HTML 200 response (malformed success)', async () => {
    const provider = makeProvider();
    const response = {
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers({ 'content-type': 'text/html' }),
      json: jest.fn().mockRejectedValue(new SyntaxError('Unexpected token <')),
      text: jest.fn().mockResolvedValue('<html>Not JSON</html>'),
    } as unknown as Response;
    fetchMock.mockResolvedValueOnce(response);

    // json() parse failure should cause an error.
    await expect(provider.search('test')).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Connection reset / ECONNREFUSED
// ---------------------------------------------------------------------------

describe('Mem0Provider — connection errors', () => {
  it('throws on ECONNREFUSED', async () => {
    const provider = makeProvider();
    const connError = new Error('connect ECONNREFUSED 127.0.0.1:443');
    (connError as any).code = 'ECONNREFUSED';
    fetchMock.mockRejectedValueOnce(connError);

    await expect(provider.search('test')).rejects.toThrow(/ECONNREFUSED/);
  });

  it('throws on ECONNRESET', async () => {
    const provider = makeProvider();
    const resetError = new Error('read ECONNRESET');
    (resetError as any).code = 'ECONNRESET';
    fetchMock.mockRejectedValueOnce(resetError);

    await expect(provider.search('test')).rejects.toThrow(/ECONNRESET/);
  });

  it('throws on ETIMEDOUT', async () => {
    const provider = makeProvider();
    const timeoutError = new Error('connect ETIMEDOUT');
    (timeoutError as any).code = 'ETIMEDOUT';
    fetchMock.mockRejectedValueOnce(timeoutError);

    await expect(provider.search('test')).rejects.toThrow(/ETIMEDOUT/);
  });

  it('retries connection errors when maxRetries > 0', async () => {
    const provider = makeProvider({ maxRetries: 1, timeoutMs: 15_000 });
    let callCount = 0;
    fetchMock.mockImplementation(async () => {
      callCount++;
      if (callCount === 1) throw new Error('connect ECONNREFUSED');
      return jsonResponse({ results: [] });
    });

    const result = await provider.search('test');
    expect(result.results).toEqual([]);
    expect(callCount).toBe(2);
  }, 15_000);
});

// ---------------------------------------------------------------------------
// Partial JSON response (truncated)
// ---------------------------------------------------------------------------

describe('Mem0Provider — partial/truncated JSON', () => {
  it('throws when response JSON is truncated', async () => {
    const provider = makeProvider();
    const response = {
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers({ 'content-type': 'application/json' }),
      json: jest.fn().mockRejectedValue(new SyntaxError('Unexpected end of JSON input')),
      text: jest.fn().mockResolvedValue('{"results": [{"id": "trunc'),
    } as unknown as Response;
    fetchMock.mockResolvedValueOnce(response);

    await expect(provider.search('test')).rejects.toThrow();
  });

  it('throws when response body is empty on 200', async () => {
    const provider = makeProvider();
    const response = {
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers({ 'content-type': 'application/json' }),
      json: jest.fn().mockRejectedValue(new SyntaxError('Unexpected end of JSON input')),
      text: jest.fn().mockResolvedValue(''),
    } as unknown as Response;
    fetchMock.mockResolvedValueOnce(response);

    await expect(provider.search('test')).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// healthCheck integration
// ---------------------------------------------------------------------------

describe('Mem0Provider — healthCheck edge cases', () => {
  it('returns true on successful API response', async () => {
    const provider = makeProvider();
    fetchMock.mockResolvedValueOnce(jsonResponse({ results: [] }));

    expect(await provider.healthCheck()).toBe(true);
  });

  it('returns false on 401', async () => {
    const provider = makeProvider();
    fetchMock.mockResolvedValueOnce(errorResponse(401, 'Unauthorized'));

    expect(await provider.healthCheck()).toBe(false);
  });

  it('returns false on 500', async () => {
    const provider = makeProvider();
    fetchMock.mockResolvedValueOnce(errorResponse(500, 'Internal Server Error'));

    expect(await provider.healthCheck()).toBe(false);
  });

  it('returns false on network error', async () => {
    const provider = makeProvider();
    fetchMock.mockRejectedValueOnce(new Error('DNS resolution failed'));

    expect(await provider.healthCheck()).toBe(false);
  });

  it('returns false on timeout', async () => {
    const provider = makeProvider({ timeoutMs: 100 });
    const abortError = new DOMException('The operation was aborted', 'AbortError');
    fetchMock.mockRejectedValueOnce(abortError);

    expect(await provider.healthCheck()).toBe(false);
  });

  it('healthCheck does not affect subsequent operations', async () => {
    const provider = makeProvider();

    // Failing healthCheck.
    fetchMock.mockRejectedValueOnce(new Error('down'));
    expect(await provider.healthCheck()).toBe(false);

    // Normal operation should still work.
    fetchMock.mockResolvedValueOnce(jsonResponse({ results: [{ id: '1', memory: 'ok' }] }));
    const result = await provider.search('test');
    expect(result.results).toHaveLength(1);
  });
});
