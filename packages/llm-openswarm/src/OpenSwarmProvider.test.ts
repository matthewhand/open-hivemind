jest.mock('dns', () => ({
  promises: { lookup: jest.fn().mockResolvedValue({ address: '1.2.3.4', family: 4 }) },
}));

let OpenSwarmProvider: any;
let create: any;
let manifest: any;

beforeEach(async () => {
  jest.resetModules();
  jest.doMock('@hivemind/shared-types', () => {
    const actual = jest.requireActual('@hivemind/shared-types');
    return { ...actual, isSafeUrl: jest.fn().mockResolvedValue(true) };
  });
  ({ OpenSwarmProvider } = await import('./OpenSwarmProvider'));
  ({ create, manifest } = await import('./index'));
  jest.clearAllMocks();
});

afterEach(() => jest.restoreAllMocks());

function mockFetch(body: unknown, status = 200) {
  jest.spyOn(global, 'fetch').mockResolvedValue(
    new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
  );
}

describe('OpenSwarmProvider', () => {
  it('manifest type is llm', () => {
    expect(manifest.type).toBe('llm');
  });

  it('supportsChatCompletion returns true', () => {
    expect(new OpenSwarmProvider().supportsChatCompletion()).toBe(true);
  });

  it('supportsCompletion returns true', () => {
    expect(new OpenSwarmProvider().supportsCompletion()).toBe(true);
  });

  it('validateCredentials returns true when baseUrl is set', async () => {
    expect(await new OpenSwarmProvider().validateCredentials()).toBe(true);
  });

  it('generateChatCompletion returns content string', async () => {
    mockFetch({ choices: [{ message: { content: 'swarm reply' } }] });
    const result = await new OpenSwarmProvider().generateChatCompletion('hello', [], {});
    expect(result).toBe('swarm reply');
  });

  it('generateChatCompletion returns fallback on empty choices', async () => {
    mockFetch({ choices: [] });
    const result = await new OpenSwarmProvider().generateChatCompletion('hello', [], {});
    expect(result).toBe('No response');
  });

  it('generateChatCompletion returns error string on HTTP failure', async () => {
    mockFetch({ error: 'fail' }, 500);
    const result = await new OpenSwarmProvider().generateChatCompletion('hello', [], {});
    expect(result).toMatch(/Error:/);
  });

  it('generateCompletion delegates to generateChatCompletion', async () => {
    mockFetch({ choices: [{ message: { content: 'ok' } }] });
    expect(await new OpenSwarmProvider().generateCompletion('ping')).toBe('ok');
  });

  it('generateResponse delegates to generateChatCompletion', async () => {
    mockFetch({ choices: [{ message: { content: 'response' } }] });
    const msg = { getText: () => 'hi', metadata: {} } as any;
    expect(await new OpenSwarmProvider().generateResponse(msg, [])).toBe('response');
  });
});
