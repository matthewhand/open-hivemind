import { http, createHttpClient, HttpError, isHttpError } from './httpClient';

// Mock isSafeUrl so tests don't do real DNS lookups
jest.mock('./ssrfGuard', () => ({
  isSafeUrl: jest.fn(async (url: string) => {
    // Treat localhost and private IPs as unsafe, everything else safe
    return !url.includes('localhost') && !url.includes('127.0.0.1') && !url.includes('169.254') && !url.includes('internal');
  }),
}));

const SAFE_URL = 'https://api.example.com/data';
const UNSAFE_URL = 'http://localhost:8080/secret';

function mockFetch(status: number, body: unknown, contentType = 'application/json') {
  const headers = new Headers({ 'content-type': contentType });
  const response = new Response(
    status === 204 ? null : typeof body === 'string' ? body : JSON.stringify(body),
    { status, headers }
  );
  jest.spyOn(global, 'fetch').mockResolvedValue(response);
}

beforeEach(() => jest.clearAllMocks());
afterEach(() => jest.restoreAllMocks());

describe('HttpError', () => {
  it('has correct name, status, and data', () => {
    const err = new HttpError(404, { msg: 'not found' }, 'HTTP 404');
    expect(err.name).toBe('HttpError');
    expect(err.status).toBe(404);
    expect(err.data).toEqual({ msg: 'not found' });
    expect(err.message).toBe('HTTP 404');
  });
});

describe('isHttpError', () => {
  it('returns true for HttpError', () => expect(isHttpError(new HttpError(500, null, 'err'))).toBe(true));
  it('returns false for plain Error', () => expect(isHttpError(new Error('x'))).toBe(false));
  it('returns false for non-errors', () => expect(isHttpError('string')).toBe(false));
});

describe('SSRF protection', () => {
  it('throws HttpError for unsafe URL', async () => {
    await expect(http.get(UNSAFE_URL)).rejects.toThrow(HttpError);
    await expect(http.get(UNSAFE_URL)).rejects.toMatchObject({ status: 0 });
  });

  it('throws for internal hostnames', async () => {
    await expect(http.get('http://internal.corp/api')).rejects.toThrow(HttpError);
  });

  it('validates full URL including query params', async () => {
    // params are appended before isSafeUrl check
    await expect(http.get('https://api.example.com', { params: { redirect: 'http://localhost' } }))
      .rejects.toThrow(HttpError);
  });

  it('allows safe URLs', async () => {
    mockFetch(200, { ok: true });
    await expect(http.get(SAFE_URL)).resolves.toEqual({ ok: true });
  });
});

describe('http.get', () => {
  it('makes GET request and returns JSON', async () => {
    mockFetch(200, { id: 1 });
    const result = await http.get<{ id: number }>(SAFE_URL);
    expect(result).toEqual({ id: 1 });
    expect(fetch).toHaveBeenCalledWith(SAFE_URL, expect.objectContaining({ method: 'GET' }));
  });

  it('appends query params to URL', async () => {
    mockFetch(200, {});
    await http.get(SAFE_URL, { params: { page: 1, limit: 10 } });
    const calledUrl = (fetch as jest.Mock).mock.calls[0][0] as string;
    expect(calledUrl).toContain('page=1');
    expect(calledUrl).toContain('limit=10');
  });

  it('does not send body on GET', async () => {
    mockFetch(200, {});
    await http.get(SAFE_URL);
    const init = (fetch as jest.Mock).mock.calls[0][1];
    expect(init.body).toBeUndefined();
  });
});

describe('http.post', () => {
  it('sends JSON body', async () => {
    mockFetch(201, { created: true });
    await http.post(SAFE_URL, { name: 'test' });
    const init = (fetch as jest.Mock).mock.calls[0][1];
    expect(init.method).toBe('POST');
    expect(init.body).toBe(JSON.stringify({ name: 'test' }));
  });
});

describe('http.put / http.delete', () => {
  it('put sends correct method', async () => {
    mockFetch(200, { updated: true });
    await http.put(SAFE_URL, { value: 42 });
    expect((fetch as jest.Mock).mock.calls[0][1].method).toBe('PUT');
  });

  it('delete sends correct method', async () => {
    mockFetch(204, null);
    await http.delete(SAFE_URL);
    expect((fetch as jest.Mock).mock.calls[0][1].method).toBe('DELETE');
  });
});

describe('response handling', () => {
  it('returns undefined for 204 No Content', async () => {
    mockFetch(204, null);
    const result = await http.delete(SAFE_URL);
    expect(result).toBeUndefined();
  });

  it('throws HttpError on 4xx', async () => {
    mockFetch(404, { error: 'not found' });
    await expect(http.get(SAFE_URL)).rejects.toMatchObject({ status: 404 });
  });

  it('throws HttpError on 5xx', async () => {
    mockFetch(500, { error: 'server error' });
    await expect(http.get(SAFE_URL)).rejects.toMatchObject({ status: 500 });
  });

  it('handles non-JSON response gracefully', async () => {
    mockFetch(200, 'plain text response', 'text/plain');
    const result = await http.get<string>(SAFE_URL);
    expect(result).toBe('plain text response');
  });

  it('merges custom headers with defaults', async () => {
    mockFetch(200, {});
    await http.get(SAFE_URL, { headers: { 'X-Custom': 'value' } });
    const init = (fetch as jest.Mock).mock.calls[0][1];
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(init.headers['X-Custom']).toBe('value');
  });
});

describe('createHttpClient', () => {
  it('prepends baseURL to paths', async () => {
    mockFetch(200, {});
    const client = createHttpClient('https://api.example.com');
    await client.get('/users');
    expect(fetch).toHaveBeenCalledWith('https://api.example.com/users', expect.anything());
  });

  it('strips trailing slash from baseURL', async () => {
    mockFetch(200, {});
    const client = createHttpClient('https://api.example.com/');
    await client.get('/users');
    expect(fetch).toHaveBeenCalledWith('https://api.example.com/users', expect.anything());
  });

  it('merges default headers', async () => {
    mockFetch(200, {});
    const client = createHttpClient('https://api.example.com', { Authorization: 'Bearer token' });
    await client.get('/me');
    const init = (fetch as jest.Mock).mock.calls[0][1];
    expect(init.headers['Authorization']).toBe('Bearer token');
  });

  it('throws for absolute path injection', () => {
    const client = createHttpClient('https://api.example.com');
    expect(() => (client as any).get('https://evil.com/steal')).toThrow(HttpError);
    expect(() => (client as any).get('//evil.com/steal')).toThrow(HttpError);
  });

  it('supports all HTTP methods', async () => {
    for (const [method, fn] of [
      ['GET', () => createHttpClient('https://api.example.com').get('/x')],
      ['POST', () => createHttpClient('https://api.example.com').post('/x', {})],
      ['PUT', () => createHttpClient('https://api.example.com').put('/x', {})],
      ['DELETE', () => createHttpClient('https://api.example.com').delete('/x')],
    ] as const) {
      mockFetch(200, {});
      await (fn as () => Promise<unknown>)();
      expect((fetch as jest.Mock).mock.calls.at(-1)![1].method).toBe(method);
    }
  });
});
