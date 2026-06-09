import Letta from '@letta-ai/letta-client';
import { LettaProvider } from './lettaProvider';

jest.mock('@letta-ai/letta-client');

const mockCreate = jest.fn();
const mockConvList = jest.fn();
const mockConvCreate = jest.fn();
const mockConvMessageCreate = jest.fn();
const MockLetta = Letta as jest.MockedClass<typeof Letta>;

beforeEach(() => {
  jest.clearAllMocks();
  (LettaProvider as any).instance = undefined;
  MockLetta.mockImplementation(
    () =>
      ({
        agents: { messages: { create: mockCreate } },
        conversations: {
          list: mockConvList,
          create: mockConvCreate,
          messages: { create: mockConvMessageCreate },
        },
      }) as any
  );
});

describe('LettaProvider.generateChatCompletion', () => {
  it('throws when no agentId is configured', async () => {
    delete process.env.LETTA_AGENT_ID;
    const provider = LettaProvider.getInstance();
    await expect(provider.generateChatCompletion('hello', [])).rejects.toThrow('No agent ID');
  });

  it('sends message and returns assistant content string', async () => {
    mockCreate.mockResolvedValue({
      messages: [
        { role: 'user', content: 'hello' },
        { role: 'assistant', content: 'world' },
      ],
      stop_reason: 'end_turn',
      usage: {},
    });
    const provider = LettaProvider.getInstance();
    const result = await provider.generateChatCompletion('hello', [], { agentId: 'agent-123' });
    expect(result).toBe('world');
    expect(mockCreate).toHaveBeenCalledWith('agent-123', { input: 'hello' });
  });

  it('prepends systemPrompt from metadata', async () => {
    mockCreate.mockResolvedValue({
      messages: [{ role: 'assistant', content: 'ok' }],
      stop_reason: 'end_turn',
      usage: {},
    });
    const provider = LettaProvider.getInstance();
    await provider.generateChatCompletion('hi', [], {
      agentId: 'agent-123',
      systemPrompt: 'be terse',
    });
    expect(mockCreate).toHaveBeenCalledWith('agent-123', { input: 'be terse\n\nhi' });
  });

  it('returns empty string when no assistant message in response', async () => {
    mockCreate.mockResolvedValue({
      messages: [{ role: 'tool', content: 'tool result' }],
      stop_reason: 'end_turn',
      usage: {},
    });
    const provider = LettaProvider.getInstance();
    const result = await provider.generateChatCompletion('hi', [], { agentId: 'agent-123' });
    expect(result).toBe('');
  });

  it('extracts text from array content', async () => {
    mockCreate.mockResolvedValue({
      messages: [{ role: 'assistant', content: [{ type: 'text', text: 'array reply' }] }],
      stop_reason: 'end_turn',
      usage: {},
    });
    const provider = LettaProvider.getInstance();
    const result = await provider.generateChatCompletion('hi', [], { agentId: 'agent-123' });
    expect(result).toBe('array reply');
  });
});

describe('LettaProvider session modes', () => {
  it('per-channel mode creates conversation and uses conversations API', async () => {
    mockConvList.mockResolvedValue([]);
    mockConvCreate.mockResolvedValue({ id: 'conv-new-123', summary: 'channel-456' });
    mockConvMessageCreate.mockResolvedValue({
      messages: [{ role: 'assistant', content: 'per-channel response' }],
    });

    const provider = LettaProvider.getInstance({
      agentId: 'agent-123',
      sessionMode: 'per-channel',
    });

    const result = await provider.generateChatCompletion('hello', [], {
      agentId: 'agent-123',
      channelId: '456',
    });

    expect(result).toBe('per-channel response');
    expect(mockConvList).toHaveBeenCalledWith({ agent_id: 'agent-123' });
    expect(mockConvCreate).toHaveBeenCalledWith({
      agent_id: 'agent-123',
      summary: 'channel-456',
    });
    expect(mockConvMessageCreate).toHaveBeenCalledWith('conv-new-123', {
      agent_id: 'agent-123',
      messages: [{ role: 'user', content: 'hello' }],
    });
    // Default API should NOT be called
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('per-user mode creates conversation with user key', async () => {
    mockConvList.mockResolvedValue([]);
    mockConvCreate.mockResolvedValue({ id: 'conv-user-789', summary: 'user-user-789' });
    mockConvMessageCreate.mockResolvedValue({
      messages: [{ role: 'assistant', content: 'per-user response' }],
    });

    const provider = LettaProvider.getInstance({
      agentId: 'agent-123',
      sessionMode: 'per-user',
    });

    const result = await provider.generateChatCompletion('hello', [], {
      agentId: 'agent-123',
      userId: 'user-789',
    });

    expect(result).toBe('per-user response');
    expect(mockConvCreate).toHaveBeenCalledWith({
      agent_id: 'agent-123',
      summary: 'user-user-789',
    });
    expect(mockConvMessageCreate).toHaveBeenCalled();
  });

  it('fixed mode uses provided conversationId directly', async () => {
    mockConvMessageCreate.mockResolvedValue({
      messages: [{ role: 'assistant', content: 'fixed conv response' }],
    });

    const provider = LettaProvider.getInstance({
      agentId: 'agent-123',
      sessionMode: 'fixed',
      conversationId: 'conv-fixed-999',
    });

    const result = await provider.generateChatCompletion('hello', [], {
      agentId: 'agent-123',
    });

    expect(result).toBe('fixed conv response');
    // Should use the fixed conversationId directly
    expect(mockConvMessageCreate).toHaveBeenCalledWith('conv-fixed-999', {
      agent_id: 'agent-123',
      messages: [{ role: 'user', content: 'hello' }],
    });
    // Should NOT create or list conversations
    expect(mockConvList).not.toHaveBeenCalled();
    expect(mockConvCreate).not.toHaveBeenCalled();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('per-channel falls back to default when no channelId in metadata', async () => {
    mockCreate.mockResolvedValue({
      messages: [{ role: 'assistant', content: 'default response' }],
    });

    const provider = LettaProvider.getInstance({
      agentId: 'agent-123',
      sessionMode: 'per-channel',
    });

    const result = await provider.generateChatCompletion('hello', [], {
      agentId: 'agent-123',
      // No channelId provided
    });

    expect(result).toBe('default response');
    // Should fall back to default API
    expect(mockCreate).toHaveBeenCalledWith('agent-123', { input: 'hello' });
    // Should NOT use conversations API
    expect(mockConvList).not.toHaveBeenCalled();
    expect(mockConvCreate).not.toHaveBeenCalled();
  });

  it('falls back to default when the SDK lacks the conversations API', async () => {
    // Simulate an older/stubbed SDK build with no conversations resource.
    MockLetta.mockImplementationOnce(
      () =>
        ({
          agents: { messages: { create: mockCreate } },
          // No `conversations` property at all.
        }) as any
    );
    mockCreate.mockResolvedValue({
      messages: [{ role: 'assistant', content: 'default fallback response' }],
    });

    const provider = LettaProvider.getInstance({
      agentId: 'agent-123',
      sessionMode: 'per-channel',
    });

    const result = await provider.generateChatCompletion('hello', [], {
      agentId: 'agent-123',
      channelId: '456',
    });

    // Capability gap is handled gracefully: routes through the default agent API.
    expect(result).toBe('default fallback response');
    expect(mockCreate).toHaveBeenCalledWith('agent-123', { input: 'hello' });
    // No attempt to list/create conversations on an unsupported SDK.
    expect(mockConvList).not.toHaveBeenCalled();
    expect(mockConvCreate).not.toHaveBeenCalled();
  });

  it('falls back to default when conversations.create is not a function', async () => {
    // Partial SDK: list exists but create is missing/non-callable.
    MockLetta.mockImplementationOnce(
      () =>
        ({
          agents: { messages: { create: mockCreate } },
          conversations: {
            list: mockConvList,
            create: undefined,
            messages: { create: mockConvMessageCreate },
          },
        }) as any
    );
    mockCreate.mockResolvedValue({
      messages: [{ role: 'assistant', content: 'partial fallback response' }],
    });

    const provider = LettaProvider.getInstance({
      agentId: 'agent-123',
      sessionMode: 'per-user',
    });

    const result = await provider.generateChatCompletion('hello', [], {
      agentId: 'agent-123',
      userId: 'user-789',
    });

    expect(result).toBe('partial fallback response');
    expect(mockCreate).toHaveBeenCalledWith('agent-123', { input: 'hello' });
    // Capability check short-circuits before calling list when the API is incomplete.
    expect(mockConvList).not.toHaveBeenCalled();
  });

  it('cache hit avoids duplicate conversation creation calls', async () => {
    mockConvList.mockResolvedValue([]);
    mockConvCreate.mockResolvedValue({ id: 'conv-cached', summary: 'channel-789' });
    mockConvMessageCreate.mockResolvedValue({
      messages: [{ role: 'assistant', content: 'cached response' }],
    });

    const provider = LettaProvider.getInstance({
      agentId: 'agent-123',
      sessionMode: 'per-channel',
    });

    // First call - should create conversation
    await provider.generateChatCompletion('hello', [], {
      agentId: 'agent-123',
      channelId: '789',
    });

    // Second call - should use cached conversation ID
    await provider.generateChatCompletion('hello again', [], {
      agentId: 'agent-123',
      channelId: '789',
    });

    // Conversation should only be created once
    expect(mockConvCreate).toHaveBeenCalledTimes(1);
    // But messages should be sent twice
    expect(mockConvMessageCreate).toHaveBeenCalledTimes(2);
  });
});

describe('LettaProvider per-bot config isolation', () => {
  it('create() returns distinct providers honoring each bot config', async () => {
    const { create } = await import('./index');

    const botA = create({ agentId: 'agent-aaa' });
    const botB = create({ agentId: 'agent-bbb' });

    // Two different bots must not share one instance.
    expect(botA).not.toBe(botB);

    mockCreate.mockResolvedValue({
      messages: [{ role: 'assistant', content: 'ok' }],
    });

    // Each provider routes to its own configured agentId (no metadata override).
    await botA.generateChatCompletion('hi', []);
    expect(mockCreate).toHaveBeenLastCalledWith('agent-aaa', { input: 'hi' });

    await botB.generateChatCompletion('hi', []);
    expect(mockCreate).toHaveBeenLastCalledWith('agent-bbb', { input: 'hi' });
  });

  it('isolates session config and conversation caches between bots', async () => {
    const { create } = await import('./index');

    mockConvList.mockResolvedValue([]);
    mockConvCreate.mockResolvedValue({ id: 'conv-fixed-A', summary: '' });
    mockConvMessageCreate.mockResolvedValue({
      messages: [{ role: 'assistant', content: 'reply' }],
    });

    const fixedBot = create({
      agentId: 'agent-fixed',
      sessionMode: 'fixed',
      conversationId: 'conv-fixed-A',
    });
    const defaultBot = create({ agentId: 'agent-default' });

    await fixedBot.generateChatCompletion('hi', []);
    // Fixed bot uses its conversation API with its own conversationId.
    expect(mockConvMessageCreate).toHaveBeenCalledWith('conv-fixed-A', {
      agent_id: 'agent-fixed',
      messages: [{ role: 'user', content: 'hi' }],
    });

    mockCreate.mockResolvedValue({
      messages: [{ role: 'assistant', content: 'reply' }],
    });
    await defaultBot.generateChatCompletion('hi', []);
    // Default bot is unaffected by the other bot's session config.
    expect(mockCreate).toHaveBeenCalledWith('agent-default', { input: 'hi' });
  });
});

describe('LettaProvider client construction (per-bot auth/baseUrl)', () => {
  const ORIGINAL_ENV = {
    LETTA_SERVER_PASSWORD: process.env.LETTA_SERVER_PASSWORD,
    LETTA_BASE_URL: process.env.LETTA_BASE_URL,
  };

  beforeEach(() => {
    delete process.env.LETTA_SERVER_PASSWORD;
    delete process.env.LETTA_BASE_URL;
  });

  afterAll(() => {
    for (const [key, value] of Object.entries(ORIGINAL_ENV)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it('create() wires per-bot apiKey and baseUrl through to the Letta client', async () => {
    const { create } = await import('./index');

    create({ agentId: 'agent-123', apiKey: 'bot-specific-key', baseUrl: 'http://bot-host:8283' });

    expect(MockLetta).toHaveBeenCalledWith({
      apiKey: 'bot-specific-key',
      baseURL: 'http://bot-host:8283',
    });
  });

  it('create() accepts raw schema env-var keys', async () => {
    const { create } = await import('./index');

    create({
      LETTA_API_KEY: 'env-style-key',
      LETTA_BASE_URL: 'http://env-style:8283',
    });

    expect(MockLetta).toHaveBeenCalledWith({
      apiKey: 'env-style-key',
      baseURL: 'http://env-style:8283',
    });
  });

  it('falls back to LETTA_SERVER_PASSWORD and LETTA_BASE_URL env when config omits them', async () => {
    process.env.LETTA_SERVER_PASSWORD = 'env-password';
    process.env.LETTA_BASE_URL = 'http://env-host:8283';
    const { create } = await import('./index');

    create({ agentId: 'agent-123' });

    expect(MockLetta).toHaveBeenCalledWith({
      apiKey: 'env-password',
      baseURL: 'http://env-host:8283',
    });
  });

  it('per-bot config wins over process-wide env', async () => {
    process.env.LETTA_SERVER_PASSWORD = 'env-password';
    process.env.LETTA_BASE_URL = 'http://env-host:8283';
    const { create } = await import('./index');

    create({ apiKey: 'bot-key', baseUrl: 'http://bot-host:8283' });

    expect(MockLetta).toHaveBeenCalledWith({
      apiKey: 'bot-key',
      baseURL: 'http://bot-host:8283',
    });
  });
});

describe('LettaProvider.generateCompletion', () => {
  it('maps a non-chat completion onto a single-turn chat completion', async () => {
    mockCreate.mockResolvedValue({
      messages: [{ role: 'assistant', content: 'completion reply' }],
    });
    const provider = LettaProvider.getInstance({ agentId: 'agent-123' });

    const result = await provider.generateCompletion('a single-turn prompt');

    expect(result).toBe('completion reply');
    // Prompt is forwarded as the user input with no history, via the default
    // (stateful agent) chat path.
    expect(mockCreate).toHaveBeenCalledWith('agent-123', { input: 'a single-turn prompt' });
  });

  it('propagates the missing-agent error from the underlying chat path', async () => {
    delete process.env.LETTA_AGENT_ID;
    const provider = LettaProvider.getInstance();
    await expect(provider.generateCompletion('prompt')).rejects.toThrow('No agent ID');
  });

  it('still reports native non-chat completion as unsupported', () => {
    const provider = LettaProvider.getInstance();
    // Letta has no dedicated completion endpoint; the flag must stay false so
    // callers prefer the chat path (and only fall back to the mapping).
    expect(provider.supportsCompletion()).toBe(false);
  });
});
