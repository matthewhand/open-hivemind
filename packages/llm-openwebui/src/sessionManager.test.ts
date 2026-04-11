jest.mock('dns', () => ({
  promises: { lookup: jest.fn().mockResolvedValue({ address: '1.2.3.4', family: 4 }) },
}));

jest.mock('convict', () =>
  jest.fn(() => ({
    get: jest.fn((key: string) => {
      if (key === 'apiUrl') return 'https://openwebui.example.com';
      if (key === 'username') return 'user';
      if (key === 'password') return 'pass';
      return '';
    }),
    getProperties: jest.fn(() => ({ apiUrl: 'https://openwebui.example.com', username: 'user', password: 'pass' })),
    set: jest.fn(),
    validate: jest.fn(),
  }))
);

jest.mock('@hivemind/shared-types', () => {
  const actual = jest.requireActual('@hivemind/shared-types');
  return { ...actual, isSafeUrl: jest.fn().mockResolvedValue(true) };
});

function mockFetch(body: unknown, status = 200) {
  jest.spyOn(global, 'fetch').mockResolvedValue(
    new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
  );
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
