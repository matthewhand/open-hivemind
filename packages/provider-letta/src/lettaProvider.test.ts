import Letta from '@letta-ai/letta-client';
import { LettaProvider } from './lettaProvider';

jest.mock('@letta-ai/letta-client');

const mockCreate = jest.fn();
const MockLetta = Letta as jest.MockedClass<typeof Letta>;

beforeEach(() => {
  jest.clearAllMocks();
  (LettaProvider as any).instance = undefined;
  MockLetta.mockImplementation(() => ({
    agents: { messages: { create: mockCreate } },
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

describe('LettaProvider.generateCompletion', () => {
  it('throws unsupported error', async () => {
    const provider = LettaProvider.getInstance();
    await expect(provider.generateCompletion('prompt')).rejects.toThrow();
  });
});
