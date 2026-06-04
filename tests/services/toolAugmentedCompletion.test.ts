import type {
  ILlmProvider,
  LlmChatMessage,
  LlmToolCompletionResult,
  LlmToolDefinition,
} from '@src/llm/interfaces/ILlmProvider';
import type { IMessage } from '@src/message/interfaces/IMessage';

// --- Mock ToolManager so the tool loop is fully controllable -----------------

const mockGetToolsForBot = jest.fn();
const mockFormatToolsForLLM = jest.fn();
const mockGetMaxToolCalls = jest.fn();
const mockExecuteTool = jest.fn();

jest.mock('@src/services/ToolManager', () => ({
  ToolManager: {
    getInstance: () => ({
      getToolsForBot: mockGetToolsForBot,
      formatToolsForLLM: mockFormatToolsForLLM,
      getMaxToolCalls: mockGetMaxToolCalls,
      executeTool: mockExecuteTool,
    }),
  },
}));

// Import after the mock is registered.
import { toolAugmentedCompletion } from '@src/services/toolAugmentedCompletion';

const sampleTool: LlmToolDefinition = {
  type: 'function',
  function: { name: 'get_weather', description: 'Get weather', parameters: { type: 'object' } },
};

function makeProvider(
  impl?: jest.Mock<Promise<LlmToolCompletionResult>, [LlmChatMessage[], LlmToolDefinition[], any?]>
): ILlmProvider {
  const provider: ILlmProvider = {
    name: 'mock',
    supportsChatCompletion: () => true,
    supportsCompletion: () => true,
    generateChatCompletion: jest.fn(async () => 'standard-reply'),
    generateCompletion: jest.fn(async () => 'completion'),
  };
  if (impl) {
    provider.generateChatCompletionWithTools = impl;
  }
  return provider;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetMaxToolCalls.mockReturnValue(5);
  mockFormatToolsForLLM.mockReturnValue([sampleTool]);
});

describe('toolAugmentedCompletion', () => {
  it('falls back to plain generateChatCompletion when the bot has no tools', async () => {
    mockGetToolsForBot.mockResolvedValue([]);
    const provider = makeProvider();

    const result = await toolAugmentedCompletion({
      botName: 'bot',
      llmProvider: provider,
      userMessage: 'hi',
      historyMessages: [],
      metadata: {},
      systemPrompt: 'sys',
    });

    expect(result).toBe('standard-reply');
    expect(provider.generateChatCompletion).toHaveBeenCalledTimes(1);
  });

  it('routes through the provider abstraction when generateChatCompletionWithTools exists', async () => {
    mockGetToolsForBot.mockResolvedValue([{ name: 'get_weather' }]);

    // First turn requests a tool call; second turn returns final text.
    const toolAware = jest
      .fn<Promise<LlmToolCompletionResult>, [LlmChatMessage[], LlmToolDefinition[], any?]>()
      .mockResolvedValueOnce({
        content: null,
        tool_calls: [
          {
            id: 'call_1',
            type: 'function',
            function: { name: 'get_weather', arguments: '{"city":"NYC"}' },
          },
        ],
      })
      .mockResolvedValueOnce({ content: 'It is sunny in NYC.' });

    mockExecuteTool.mockResolvedValue({ toolName: 'get_weather', success: true, result: 'sunny' });

    const provider = makeProvider(toolAware);

    const result = await toolAugmentedCompletion({
      botName: 'bot',
      llmProvider: provider,
      userMessage: 'weather in NYC?',
      historyMessages: [],
      metadata: { model: 'gpt-4o' },
      systemPrompt: 'sys',
      toolContext: { userId: 'u1', channelId: 'c1' },
    });

    expect(result).toBe('It is sunny in NYC.');
    // Provider abstraction was used for both turns; direct OpenAI path never touched.
    expect(toolAware).toHaveBeenCalledTimes(2);
    expect(mockExecuteTool).toHaveBeenCalledWith(
      'bot',
      'get_weather',
      { city: 'NYC' },
      { userId: 'u1', channelId: 'c1' }
    );

    // The tool result must be appended into the messages passed on the 2nd call.
    const secondCallMessages = toolAware.mock.calls[1][0];
    const toolMsg = secondCallMessages.find((m) => m.role === 'tool');
    expect(toolMsg).toMatchObject({
      role: 'tool',
      tool_call_id: 'call_1',
      name: 'get_weather',
      content: 'sunny',
    });
  });

  it('forwards tools to the provider on the first turn and an empty list is fine on final text turn', async () => {
    mockGetToolsForBot.mockResolvedValue([{ name: 'get_weather' }]);

    const toolAware = jest
      .fn<Promise<LlmToolCompletionResult>, [LlmChatMessage[], LlmToolDefinition[], any?]>()
      .mockResolvedValue({ content: 'no tools needed' });

    const provider = makeProvider(toolAware);

    const result = await toolAugmentedCompletion({
      botName: 'bot',
      llmProvider: provider,
      userMessage: 'hello',
      historyMessages: [],
      metadata: {},
      systemPrompt: 'sys',
    });

    expect(result).toBe('no tools needed');
    // The tool definitions from formatToolsForLLM were forwarded.
    expect(toolAware.mock.calls[0][1]).toEqual([sampleTool]);
  });
});
