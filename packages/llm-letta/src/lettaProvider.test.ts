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
  MockLetta.mockImplementation(() => ({
    agents: { messages: { create: mockCreate } },
    conversations: {
      list: mockConvList,
      create: mockConvCreate,
      messages: { create: mockConvMessageCreate },
    },
  }) as any);
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
    await provider.generateChatCompletion('hi', [], { agentId: 'agent-123', systemPrompt: 'be terse' });
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

describe('LettaProvider.generateCompletion', () => {
  it('throws unsupported error', async () => {
    const provider = LettaProvider.getInstance();
    await expect(provider.generateCompletion('prompt')).rejects.toThrow();
  });
});
