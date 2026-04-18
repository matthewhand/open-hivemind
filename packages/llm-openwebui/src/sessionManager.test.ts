// Mock DNS so isSafeUrl always resolves to a public IP in tests
jest.mock('dns', () => ({
  promises: { lookup: jest.fn().mockResolvedValue({ address: '1.2.3.4', family: 4 }) },
}));

jest.mock('convict', () => {
  const schema: any = {};
  return jest.fn(() => ({
    schema,
    get: jest.fn((key: string) => {
      if (key === 'apiUrl') return 'https://openwebui.example.com';
      if (key === 'authMethod') return 'password';
      if (key === 'username') return 'user';
      if (key === 'password') return 'pass';
      if (key === 'apiKey') return '';
      return '';
    }),
    set: jest.fn(),
    validate: jest.fn(),
    getProperties: jest.fn(() => ({
      apiUrl: 'https://openwebui.example.com',
      authMethod: 'password',
      username: 'user',
      password: 'pass',
      apiKey: '',
    })),
  }));
});

jest.mock('@hivemind/shared-types', () => {
  const actual = jest.requireActual('@hivemind/shared-types');
  return { ...actual, isSafeUrl: jest.fn().mockResolvedValue(true) };
});

function mockFetch(body: unknown, status = 200) {
  jest.spyOn(global, 'fetch').mockResolvedValue(
    new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
  );
}

function mockConfig(authMethod: 'password' | 'apiKey', apiKey: string = '') {
  const convictMock = jest.requireMock('convict');
  convictMock.mockReturnValueOnce({
    schema: {},
    get: jest.fn((key: string) => {
      if (key === 'apiUrl') return 'https://openwebui.example.com';
      if (key === 'authMethod') return authMethod;
      if (key === 'username') return 'user';
      if (key === 'password') return 'pass';
      if (key === 'apiKey') return apiKey;
      return '';
    }),
    set: jest.fn(),
    validate: jest.fn(),
    getProperties: jest.fn(() => ({
      apiUrl: 'https://openwebui.example.com',
      authMethod,
      username: 'user',
      password: 'pass',
      apiKey,
    })),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.resetModules();
});
afterEach(() => jest.restoreAllMocks());

describe('getSessionKey', () => {
  it('fetches and returns session key', async () => {
    mockFetch({ sessionKey: 'sk-abc123' });
    const { getSessionKey } = await import('./sessionManager');
    expect(await getSessionKey()).toBe('sk-abc123');
  });

  it('throws when sessionKey missing from response', async () => {
    jest.resetModules();
    mockFetch({ sessionKey: null });
    const { getSessionKey } = await import('./sessionManager');
    await expect(getSessionKey()).rejects.toThrow('Authentication failed');
  });

  it('throws on auth failure', async () => {
    mockFetch({ error: 'unauthorized' }, 401);
    const { getSessionKey } = await import('./sessionManager');
    await expect(getSessionKey()).rejects.toThrow('Authentication failed');
  });
});

describe('refreshSessionKey', () => {
  it('clears cache and fetches new key', async () => {
    mockFetch({ sessionKey: 'sk-new' });
    const { refreshSessionKey } = await import('./sessionManager');
    await refreshSessionKey();
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});

describe('getSessionKey with API key auth', () => {
  it('returns apiKey directly when authMethod is apiKey', async () => {
    mockConfig('apiKey', 'my-api-key-123');
    const { getSessionKey } = await import('./sessionManager');
    const result = await getSessionKey();
    expect(result).toBe('my-api-key-123');
  });

  it('caches API key for subsequent calls', async () => {
    mockConfig('apiKey', 'cached-key');
    const { getSessionKey } = await import('./sessionManager');
    const key1 = await getSessionKey();
    const key2 = await getSessionKey();
    expect(key1).toBe('cached-key');
    expect(key2).toBe('cached-key');
    expect(key1).toBe(key2);
  });
});

describe('getSessionKey caching', () => {
  it('caches session key from password auth for subsequent calls', async () => {
    mockFetch({ sessionKey: 'cached-sk' });
    const { getSessionKey } = await import('./sessionManager');
    const key1 = await getSessionKey();
    const key2 = await getSessionKey();
    expect(key1).toBe('cached-sk');
    expect(key2).toBe('cached-sk');
    expect(key1).toBe(key2);
  });
});
