jest.mock('dns', () => ({
  promises: { lookup: jest.fn().mockResolvedValue({ address: '1.2.3.4', family: 4 }) },
}));

let generateChatCompletionDirect: any;

beforeEach(async () => {
  jest.resetModules();
  jest.doMock('@hivemind/shared-types', () => {
    const actual = jest.requireActual('@hivemind/shared-types');
    return { ...actual, isSafeUrl: jest.fn().mockResolvedValue(true) };
  });
  ({ generateChatCompletionDirect } = await import('./directClient'));
  jest.clearAllMocks();
});

afterEach(() => jest.restoreAllMocks());

function mockFetch(body: unknown, status = 200) {
  jest.spyOn(global, 'fetch').mockResolvedValue(
    new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
  );
}

const OVERRIDES = { apiUrl: 'https://openwebui.example.com', model: 'llama3' };

describe('generateChatCompletionDirect', () => {
  it('throws when apiUrl or model missing', async () => {
    await expect(generateChatCompletionDirect({} as any, 'hello')).rejects.toThrow(
      'require apiUrl and model'
    );
  });

  it('returns content from choices', async () => {
    mockFetch({ choices: [{ message: { content: 'direct reply' } }] });
    expect(await generateChatCompletionDirect(OVERRIDES, 'hello')).toBe('direct reply');
  });

  it('returns empty string when no content', async () => {
    mockFetch({ choices: [{ message: { content: '' } }] });
    expect(await generateChatCompletionDirect(OVERRIDES, 'hello')).toBe('');
  });

  it('includes system prompt in messages', async () => {
    mockFetch({ choices: [{ message: { content: 'ok' } }] });
    await generateChatCompletionDirect(OVERRIDES, 'hello', [], 'You are helpful');
    const body = JSON.parse((fetch as jest.Mock).mock.calls[0][1].body);
    expect(body.messages[0]).toEqual({ role: 'system', content: 'You are helpful' });
  });

  it('includes auth header when provided', async () => {
    mockFetch({ choices: [{ message: { content: 'ok' } }] });
    await generateChatCompletionDirect({ ...OVERRIDES, authHeader: 'Bearer token' }, 'hello');
    const headers = (fetch as jest.Mock).mock.calls[0][1].headers;
    expect(headers['Authorization']).toBe('Bearer token');
  });

  it('throws on HTTP error', async () => {
    mockFetch({ error: 'fail' }, 500);
    await expect(generateChatCompletionDirect(OVERRIDES, 'hello')).rejects.toThrow(
      'direct request failed'
    );
  });

  it('throws on SSRF unsafe URL', async () => {
    const { isSafeUrl } = require('@hivemind/shared-types');
    isSafeUrl.mockResolvedValueOnce(false);
    await expect(
      generateChatCompletionDirect({ apiUrl: 'http://localhost', model: 'x' }, 'hello')
    ).rejects.toThrow();
  });
});
