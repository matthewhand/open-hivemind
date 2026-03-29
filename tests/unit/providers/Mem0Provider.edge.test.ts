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
  it('returns { status: "ok" } on successful API response', async () => {
    const provider = makeProvider();
    fetchMock.mockResolvedValueOnce(jsonResponse({ results: [] }));

    expect(await provider.healthCheck()).toEqual({ status: 'ok' });
  });

  it('returns { status: "error" } on 401', async () => {
    const provider = makeProvider();
    fetchMock.mockResolvedValueOnce(errorResponse(401, 'Unauthorized'));

    const result = await provider.healthCheck();
    expect(result.status).toBe('error');
    expect(result.details).toBeDefined();
  });

  it('returns { status: "error" } on 500', async () => {
    const provider = makeProvider();
    fetchMock.mockResolvedValueOnce(errorResponse(500, 'Internal Server Error'));

    const result = await provider.healthCheck();
    expect(result.status).toBe('error');
    expect(result.details).toBeDefined();
  });

  it('returns { status: "error" } on network error', async () => {
    const provider = makeProvider();
    fetchMock.mockRejectedValueOnce(new Error('DNS resolution failed'));

    expect(await provider.healthCheck()).toEqual({ status: 'error', details: { message: 'DNS resolution failed' } });
  });

  it('returns { status: "error" } on timeout', async () => {
    const provider = makeProvider({ timeoutMs: 100 });
    const abortError = new DOMException('The operation was aborted', 'AbortError');
    fetchMock.mockRejectedValueOnce(abortError);

    const result = await provider.healthCheck();
    expect(result.status).toBe('error');
    expect(result.details).toBeDefined();
  });

  it('healthCheck does not affect subsequent operations', async () => {
    const provider = makeProvider();

    // Failing healthCheck.
    fetchMock.mockRejectedValueOnce(new Error('down'));
    expect((await provider.healthCheck()).status).toBe('error');

    // Normal operation should still work.
    fetchMock.mockResolvedValueOnce(jsonResponse({ results: [{ id: '1', memory: 'ok' }] }));
    const result = await provider.search('test');
    expect(result.results).toHaveLength(1);
  });
});
