/**
 * Comprehensive unit tests for Mem4aiProvider API client.
 *
 * Mocks global.fetch to isolate all HTTP interactions and verify
 * request construction, response handling, retries, and edge cases.
 */

import { resetAllCircuitBreakers as resetMem4aiCircuitBreakers } from '../../../packages/memory-mem4ai/src/CircuitBreaker';
import { Mem4aiProvider } from '../../../packages/memory-mem4ai/src/Mem4aiProvider';
import { Mem4aiApiError } from '../../../packages/memory-mem4ai/src/types';
import { clearCircuitBreakerRegistry } from '../../../src/common/CircuitBreaker';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

const TEST_API_KEY = 'mem4ai-test-key-abc123';
const TEST_API_URL = 'https://custom.mem4ai.test/v1';

function makeProvider(overrides: Record<string, unknown> = {}): Mem4aiProvider {
  return new Mem4aiProvider({
    apiKey: TEST_API_KEY,
    apiUrl: TEST_API_URL,
    userId: 'user-1',
    agentId: 'agent-1',
    maxRetries: 0, // no retries by default — override where needed
    timeout: 5_000,
    ...overrides,
  });
}

/** Build a minimal successful fetch Response. */
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

function noContentResponse(): Response {
  return {
    ok: true,
    status: 204,
    statusText: 'No Content',
    headers: new Headers(),
    json: jest.fn().mockRejectedValue(new Error('no body')),
    text: jest.fn().mockResolvedValue(''),
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

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

let fetchMock: jest.Mock;

beforeEach(() => {
  clearCircuitBreakerRegistry();
  resetMem4aiCircuitBreakers();
  fetchMock = jest.fn();
  global.fetch = fetchMock;
});

afterEach(() => {
  jest.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Constructor / configuration
// ---------------------------------------------------------------------------

describe('Mem4aiProvider — constructor / configuration', () => {
  it('throws when apiKey is missing', () => {
    expect(() => new Mem4aiProvider({ apiKey: '', apiUrl: TEST_API_URL })).toThrow(
      'apiKey is required'
    );
  });

  it('throws when apiUrl is missing', () => {
    expect(() => new Mem4aiProvider({ apiKey: TEST_API_KEY, apiUrl: '' })).toThrow(
      'apiUrl is required'
    );
  });

  it('strips trailing slashes from apiUrl', () => {
    const provider = new Mem4aiProvider({
      apiKey: TEST_API_KEY,
      apiUrl: 'https://custom.example.com/v1///',
      maxRetries: 0,
    });
    fetchMock.mockResolvedValueOnce(jsonResponse({ results: [] }));

    void provider.search('hello');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('https://custom.example.com/v1/memories/search/'),
      expect.anything()
    );
  });

  it('sends the API key in the Authorization header as Bearer', async () => {
    const provider = makeProvider();
    fetchMock.mockResolvedValueOnce(jsonResponse({ results: [] }));

    await provider.search('test');
    const headers = fetchMock.mock.calls[0][1].headers;
    expect(headers['Authorization']).toBe(`Bearer ${TEST_API_KEY}`);
  });

  it('sends X-Organization-ID header when organizationId is provided', async () => {
    const provider = makeProvider({ organizationId: 'org-42' });
    fetchMock.mockResolvedValueOnce(jsonResponse({ results: [] }));

    await provider.search('test');
    const headers = fetchMock.mock.calls[0][1].headers;
    expect(headers['X-Organization-ID']).toBe('org-42');
  });

  it('does not send X-Organization-ID header when organizationId is absent', async () => {
    const provider = makeProvider();
    fetchMock.mockResolvedValueOnce(jsonResponse({ results: [] }));

    await provider.search('test');
    const headers = fetchMock.mock.calls[0][1].headers;
    expect(headers['X-Organization-ID']).toBeUndefined();
  });

  it('exposes id/label/type metadata', () => {
    const provider = makeProvider();
    expect(provider.id).toBe('mem4ai');
    expect(provider.label).toBe('Mem4ai');
    expect(provider.type).toBe('memory');
  });
});

// ---------------------------------------------------------------------------
// add()
// ---------------------------------------------------------------------------

describe('Mem4aiProvider.add()', () => {
  it('stores content with metadata and returns results with ids', async () => {
    const provider = makeProvider();
    const apiResp = {
      results: [
        { id: 'mem-1', memory: 'User likes TypeScript', score: 0.95, metadata: { topic: 'lang' } },
      ],
    };
    fetchMock.mockResolvedValueOnce(jsonResponse(apiResp));

    const result = await provider.add([{ role: 'user', content: 'I love TypeScript' }], {
      metadata: { source: 'chat' },
    });

    expect(result.results).toHaveLength(1);
    expect(result.results[0]).toEqual({
      id: 'mem-1',
      memory: 'User likes TypeScript',
      score: 0.95,
      metadata: { topic: 'lang' },
    });

    // Verify request body
    const call = fetchMock.mock.calls[0];
    expect(call[0]).toBe(`${TEST_API_URL}/memories/`);
    expect(call[1].method).toBe('POST');
    const body = JSON.parse(call[1].body);
    expect(body.messages).toEqual([{ role: 'user', content: 'I love TypeScript' }]);
    expect(body.user_id).toBe('user-1');
    expect(body.agent_id).toBe('agent-1');
    expect(body.metadata).toEqual({ source: 'chat' });
  });

  it('uses option-level userId/agentId over defaults', async () => {
    const provider = makeProvider();
    fetchMock.mockResolvedValueOnce(jsonResponse({ results: [] }));

    await provider.add([{ role: 'user', content: 'hi' }], {
      userId: 'override-user',
      agentId: 'override-agent',
    });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.user_id).toBe('override-user');
    expect(body.agent_id).toBe('override-agent');
  });

  it('omits metadata key when not provided', async () => {
    const provider = makeProvider();
    fetchMock.mockResolvedValueOnce(jsonResponse({ results: [] }));

    await provider.add([{ role: 'user', content: 'hi' }]);

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.metadata).toBeUndefined();
  });

  it('sends embedding_provider_id when embeddingProviderId is configured', async () => {
    const provider = makeProvider({ embeddingProviderId: 'openai-profile' });
    fetchMock.mockResolvedValueOnce(jsonResponse({ results: [] }));

    await provider.add([{ role: 'user', content: 'hi' }]);

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.embedding_provider_id).toBe('openai-profile');
  });
});

// ---------------------------------------------------------------------------
// search()
// ---------------------------------------------------------------------------

describe('Mem4aiProvider.search()', () => {
  it('returns ranked results with scores', async () => {
    const provider = makeProvider();
    const apiResp = {
      results: [
        { id: 'mem-a', memory: 'Likes coffee', score: 0.92 },
        { id: 'mem-b', memory: 'Prefers dark mode', score: 0.78 },
      ],
    };
    fetchMock.mockResolvedValueOnce(jsonResponse(apiResp));

    const result = await provider.search('preferences');

    expect(result.results).toHaveLength(2);
    expect(result.results[0]).toEqual({ id: 'mem-a', memory: 'Likes coffee', score: 0.92 });
    expect(result.results[1]).toEqual({ id: 'mem-b', memory: 'Prefers dark mode', score: 0.78 });
  });

  it('sends custom limit when provided', async () => {
    const provider = makeProvider();
    fetchMock.mockResolvedValueOnce(jsonResponse({ results: [] }));

    await provider.search('q', { limit: 5 });
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.limit).toBe(5);
  });

  it('sends default limit when not provided', async () => {
    const provider = makeProvider();
    fetchMock.mockResolvedValueOnce(jsonResponse({ results: [] }));

    await provider.search('q');
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.limit).toBe(10); // DEFAULT_LIMIT
  });

  it('uses configured limit from config', async () => {
    const provider = makeProvider({ limit: 25 });
    fetchMock.mockResolvedValueOnce(jsonResponse({ results: [] }));

    await provider.search('q');
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.limit).toBe(25);
  });

  it('returns empty array for empty results', async () => {
    const provider = makeProvider();
    fetchMock.mockResolvedValueOnce(jsonResponse({ results: [] }));

    const result = await provider.search('nothing');
    expect(result.results).toEqual([]);
  });

  it('handles empty string query', async () => {
    const provider = makeProvider();
    fetchMock.mockResolvedValueOnce(jsonResponse({ results: [] }));

    const result = await provider.search('');
    expect(result.results).toEqual([]);

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.query).toBe('');
  });

  it('sends embedding_provider_id when configured', async () => {
    const provider = makeProvider({ embeddingProviderId: 'openai-profile' });
    fetchMock.mockResolvedValueOnce(jsonResponse({ results: [] }));

    await provider.search('q');
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.embedding_provider_id).toBe('openai-profile');
  });
});

// ---------------------------------------------------------------------------
// getAll()
// ---------------------------------------------------------------------------

describe('Mem4aiProvider.getAll()', () => {
  it('returns all memories with user_id/agent_id as query params', async () => {
    const provider = makeProvider();
    const apiResp = {
      results: [
        { id: 'mem-1', memory: 'fact 1' },
        { id: 'mem-2', memory: 'fact 2' },
      ],
    };
    fetchMock.mockResolvedValueOnce(jsonResponse(apiResp));

    const result = await provider.getAll();

    expect(result.results).toHaveLength(2);
    expect(result.results[0]).toEqual({ id: 'mem-1', memory: 'fact 1' });

    // Verify GET with query string
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain('user_id=user-1');
    expect(url).toContain('agent_id=agent-1');
    expect(fetchMock.mock.calls[0][1].method).toBe('GET');
  });

  it('uses option-level userId/agentId over defaults', async () => {
    const provider = makeProvider();
    fetchMock.mockResolvedValueOnce(jsonResponse({ results: [] }));

    await provider.getAll({ userId: 'other-user', agentId: 'other-agent' });

    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain('user_id=other-user');
    expect(url).toContain('agent_id=other-agent');
  });

  it('returns empty array when no memories exist', async () => {
    const provider = makeProvider();
    fetchMock.mockResolvedValueOnce(jsonResponse({ results: [] }));

    const result = await provider.getAll();
    expect(result.results).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// get()
// ---------------------------------------------------------------------------

describe('Mem4aiProvider.get()', () => {
  it('returns a single memory by id', async () => {
    const provider = makeProvider();
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: 'mem-99', memory: 'The earth is round' }));

    const result = await provider.get('mem-99');
    expect(result).toEqual({ id: 'mem-99', memory: 'The earth is round' });

    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toBe(`${TEST_API_URL}/memories/mem-99/`);
  });

  it('returns null when API returns 404', async () => {
    const provider = makeProvider();
    fetchMock.mockResolvedValueOnce(errorResponse(404, 'Not found'));

    const result = await provider.get('nonexistent');
    expect(result).toBeNull();
  });

  it('throws on non-404 server error', async () => {
    const provider = makeProvider();
    fetchMock.mockResolvedValueOnce(errorResponse(500, 'Internal Server Error'));

    await expect(provider.get('mem-99')).rejects.toThrow();
  });

  it('encodes special characters in memory id', async () => {
    const provider = makeProvider();
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: 'id/with spaces', memory: 'test' }));

    await provider.get('id/with spaces');
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain('id%2Fwith%20spaces');
  });
});

// ---------------------------------------------------------------------------
// update()
// ---------------------------------------------------------------------------

describe('Mem4aiProvider.update()', () => {
  it('updates memory content via PUT', async () => {
    const provider = makeProvider();
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: 'mem-1', memory: 'Updated content' }));

    const result = await provider.update('mem-1', 'Updated content');
    expect(result).toEqual({ id: 'mem-1', memory: 'Updated content' });

    const call = fetchMock.mock.calls[0];
    expect(call[0]).toBe(`${TEST_API_URL}/memories/mem-1/`);
    expect(call[1].method).toBe('PUT');
    const body = JSON.parse(call[1].body);
    expect(body.text).toBe('Updated content');
  });
});

// ---------------------------------------------------------------------------
// delete()
// ---------------------------------------------------------------------------

describe('Mem4aiProvider.delete()', () => {
  it('deletes a memory by id', async () => {
    const provider = makeProvider();
    fetchMock.mockResolvedValueOnce(noContentResponse());

    await expect(provider.delete('mem-1')).resolves.toBeUndefined();

    const call = fetchMock.mock.calls[0];
    expect(call[0]).toBe(`${TEST_API_URL}/memories/mem-1/`);
    expect(call[1].method).toBe('DELETE');
  });
});

// ---------------------------------------------------------------------------
// deleteAll()
// ---------------------------------------------------------------------------

describe('Mem4aiProvider.deleteAll()', () => {
  it('deletes all memories for default user/agent', async () => {
    const provider = makeProvider();
    fetchMock.mockResolvedValueOnce(noContentResponse());

    await expect(provider.deleteAll()).resolves.toBeUndefined();

    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain('user_id=user-1');
    expect(url).toContain('agent_id=agent-1');
    expect(fetchMock.mock.calls[0][1].method).toBe('DELETE');
  });

  it('uses option-level userId/agentId', async () => {
    const provider = makeProvider();
    fetchMock.mockResolvedValueOnce(noContentResponse());

    await provider.deleteAll({ userId: 'u2', agentId: 'a2' });

    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain('user_id=u2');
    expect(url).toContain('agent_id=a2');
  });
});

// ---------------------------------------------------------------------------
// healthCheck()
// ---------------------------------------------------------------------------

describe('Mem4aiProvider.healthCheck()', () => {
  it('returns { status: "ok" } when the API responds successfully', async () => {
    const provider = makeProvider();
    fetchMock.mockResolvedValueOnce(jsonResponse({ results: [] }));

    const ok = await provider.healthCheck();
    expect(ok).toEqual({ status: 'ok' });

    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain('limit=1');
  });

  it('returns { status: "error" } when the API errors', async () => {
    const provider = makeProvider();
    fetchMock.mockRejectedValueOnce(new Error('network down'));

    const ok = await provider.healthCheck();
    expect(ok).toEqual({ status: 'error', details: { message: 'network down' } });
  });
});

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------

describe('Mem4aiProvider — error handling', () => {
  it('throws Mem4aiApiError with status on 401', async () => {
    const provider = makeProvider();
    fetchMock.mockResolvedValueOnce(errorResponse(401, 'Invalid API key'));

    try {
      await provider.search('test');
      throw new Error('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(Mem4aiApiError);
      expect((err as Mem4aiApiError).status).toBe(401);
      expect((err as Mem4aiApiError).message).toContain('401');
      expect((err as Mem4aiApiError).body).toBe('Invalid API key');
    }
  });

  it('throws Mem4aiApiError on 403 forbidden', async () => {
    const provider = makeProvider();
    fetchMock.mockResolvedValueOnce(errorResponse(403, 'Forbidden'));

    await expect(provider.search('test')).rejects.toThrow(Mem4aiApiError);
  });

  it('propagates timeout as a descriptive error', async () => {
    const provider = makeProvider({ timeout: 100 });
    const abortError = new DOMException('The operation was aborted', 'AbortError');
    fetchMock.mockRejectedValueOnce(abortError);

    await expect(provider.search('test')).rejects.toThrow(/timed out/);
  });

  it('handles malformed JSON gracefully', async () => {
    const provider = makeProvider();
    const response = {
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers(),
      json: jest.fn().mockRejectedValue(new SyntaxError('Unexpected token')),
      text: jest.fn().mockResolvedValue('not json'),
    } as unknown as Response;
    fetchMock.mockResolvedValueOnce(response);

    await expect(provider.search('test')).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Retry / backoff behaviour
// ---------------------------------------------------------------------------

describe('Mem4aiProvider — retry behaviour', () => {
  it('retries on 429 then succeeds', async () => {
    const provider = makeProvider({ maxRetries: 1, timeout: 10_000 });

    let callCount = 0;
    fetchMock.mockImplementation(async () => {
      callCount++;
      if (callCount === 1) return errorResponse(429, 'Rate limited');
      return jsonResponse({ results: [] });
    });

    const result = await provider.search('test');
    expect(result.results).toEqual([]);
    expect(callCount).toBe(2);
  }, 15_000);

  it('retries on 500 then succeeds', async () => {
    const provider = makeProvider({ maxRetries: 1 });

    let callCount = 0;
    fetchMock.mockImplementation(async () => {
      callCount++;
      if (callCount === 1) return errorResponse(500, 'Internal error');
      return jsonResponse({ results: [{ id: '1', memory: 'ok' }] });
    });

    const result = await provider.search('test');
    expect(result.results).toHaveLength(1);
    expect(callCount).toBe(2);
  }, 15_000);

  it('retries on 503 then fails after max retries', async () => {
    const provider = makeProvider({ maxRetries: 1 });

    fetchMock.mockImplementation(async () => errorResponse(503, 'Service unavailable'));

    await expect(provider.search('test')).rejects.toThrow(Mem4aiApiError);
    // initial + 1 retry = 2 calls
    expect(fetchMock).toHaveBeenCalledTimes(2);
  }, 15_000);

  it('does not retry on 401 (non-retryable)', async () => {
    const provider = makeProvider({ maxRetries: 3 });

    fetchMock.mockResolvedValueOnce(errorResponse(401, 'Unauthorized'));

    await expect(provider.search('test')).rejects.toThrow(Mem4aiApiError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('retries on network error then succeeds', async () => {
    const provider = makeProvider({ maxRetries: 1 });

    let callCount = 0;
    fetchMock.mockImplementation(async () => {
      callCount++;
      if (callCount === 1) throw new TypeError('fetch failed');
      return jsonResponse({ results: [] });
    });

    const result = await provider.search('test');
    expect(result.results).toEqual([]);
    expect(callCount).toBe(2);
  }, 15_000);

  it('exhausts all retries with exponential backoff then throws', async () => {
    const provider = makeProvider({ maxRetries: 2 });

    fetchMock.mockImplementation(async () => errorResponse(500, 'fail'));

    await expect(provider.search('test')).rejects.toThrow(Mem4aiApiError);
    // initial + 2 retries = 3 calls
    expect(fetchMock).toHaveBeenCalledTimes(3);
  }, 15_000);
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe('Mem4aiProvider — edge cases', () => {
  it('handles very long content strings', async () => {
    const provider = makeProvider();
    const longContent = 'x'.repeat(100_000);
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ results: [{ id: 'long-1', memory: longContent }] })
    );

    const result = await provider.add([{ role: 'user', content: longContent }]);
    expect(result.results[0].memory).toHaveLength(100_000);

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.messages[0].content).toHaveLength(100_000);
  });

  it('handles special characters in metadata', async () => {
    const provider = makeProvider();
    const metadata = {
      emoji: '\u{1F600}\u{1F680}',
      quotes: 'He said "hello" & <goodbye>',
      unicode: '\u00E9\u00E8\u00EA\u00EB',
      nested: { key: 'val\nwith\nnewlines' },
    };
    fetchMock.mockResolvedValueOnce(jsonResponse({ results: [] }));

    await provider.add([{ role: 'user', content: 'test' }], { metadata });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.metadata).toEqual(metadata);
  });

  it('concurrent calls do not interfere with each other', async () => {
    const provider = makeProvider();

    fetchMock
      .mockResolvedValueOnce(jsonResponse({ results: [{ id: 'a', memory: 'first' }] }))
      .mockResolvedValueOnce(jsonResponse({ results: [{ id: 'b', memory: 'second' }] }));

    const [r1, r2] = await Promise.all([provider.search('query-a'), provider.search('query-b')]);

    expect(r1.results[0].id).toBe('a');
    expect(r2.results[0].id).toBe('b');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('omits score/metadata from result when not present in API response', async () => {
    const provider = makeProvider();
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ results: [{ id: 'bare', memory: 'just text' }] })
    );

    const result = await provider.add([{ role: 'user', content: 'hi' }]);
    expect(result.results[0]).toEqual({ id: 'bare', memory: 'just text' });
    expect(result.results[0]).not.toHaveProperty('score');
    expect(result.results[0]).not.toHaveProperty('metadata');
  });

  it('does not send body on GET requests', async () => {
    const provider = makeProvider();
    fetchMock.mockResolvedValueOnce(jsonResponse({ results: [] }));

    await provider.getAll();
    expect(fetchMock.mock.calls[0][1].body).toBeUndefined();
  });

  it('handles 204 No Content correctly for delete operations', async () => {
    const provider = makeProvider();
    fetchMock.mockResolvedValueOnce(noContentResponse());

    // Should not throw
    await provider.delete('mem-1');
  });

  it('works with no defaultUserId or defaultAgentId', async () => {
    const provider = new Mem4aiProvider({
      apiKey: TEST_API_KEY,
      apiUrl: TEST_API_URL,
      maxRetries: 0,
    });
    fetchMock.mockResolvedValueOnce(jsonResponse({ results: [] }));

    await provider.getAll();
    const url = fetchMock.mock.calls[0][0] as string;
    // No query params since neither userId nor agentId are set
    expect(url).toBe(`${TEST_API_URL}/memories/`);
  });
});
