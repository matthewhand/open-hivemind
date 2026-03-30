/**
 * Integration tests for the tool-calling pipeline.
 *
 * Verifies the full flow:
 *   user message -> tool discovery -> LLM call with tools
 *   -> tool execution -> result feedback -> final response
 *
 * Everything external (ToolManager, OpenAI SDK) is mocked so that the
 * logic inside toolAugmentedCompletion is exercised end-to-end without
 * real network calls.
 */

import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';
// Now import the function under test (after mocks are wired).
import { toolAugmentedCompletion } from '@src/services/toolAugmentedCompletion';

// ---------------------------------------------------------------------------
// Mock setup — must come before importing the module under test.
// ---------------------------------------------------------------------------

// Track calls to the OpenAI client so we can assert on them.
const mockOpenAICreate = jest.fn();

jest.mock('openai', () => ({
  OpenAI: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: mockOpenAICreate,
      },
    },
  })),
}));

jest.mock('@config/openaiConfig', () => ({
  default: {
    get: jest.fn((key: string) => {
      const map: Record<string, any> = {
        OPENAI_API_KEY: 'test-key',
        OPENAI_BASE_URL: 'https://api.openai.com/v1',
        OPENAI_MODEL: 'gpt-4o',
        OPENAI_TEMPERATURE: 0.7,
        OPENAI_MAX_TOKENS: 150,
      };
      return map[key];
    }),
  },
}));

// We mock the entire ToolManager module so that getInstance returns our stub.
const mockGetToolsForBot = jest.fn();
const mockExecuteTool = jest.fn();
const mockFormatToolsForLLM = jest.fn();
const mockGetMaxToolCalls = jest.fn();

jest.mock('@src/services/ToolManager', () => ({
  ToolManager: {
    getInstance: () => ({
      getToolsForBot: mockGetToolsForBot,
      executeTool: mockExecuteTool,
      formatToolsForLLM: mockFormatToolsForLLM,
      getMaxToolCalls: mockGetMaxToolCalls,
    }),
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convenience to build an OpenAI-style text reply (no tool calls). */
function textResponse(content: string) {
  return {
    choices: [
      {
        message: { role: 'assistant', content, tool_calls: undefined },
      },
    ],
  };
}

/** Convenience to build an OpenAI-style tool-call reply. */
function toolCallResponse(
  calls: Array<{ id: string; name: string; args: Record<string, unknown> }>,
  content: string | null = null
) {
  return {
    choices: [
      {
        message: {
          role: 'assistant',
          content,
          tool_calls: calls.map((c) => ({
            id: c.id,
            type: 'function',
            function: { name: c.name, arguments: JSON.stringify(c.args) },
          })),
        },
      },
    ],
  };
}

/** A minimal tool definition used by most tests. */
const WEATHER_TOOL = {
  name: 'get_weather',
  description: 'Get current weather',
  parameters: { type: 'object', properties: { city: { type: 'string' } } },
  serverName: 'weather-server',
};

const SEARCH_TOOL = {
  name: 'web_search',
  description: 'Search the web',
  parameters: { type: 'object', properties: { query: { type: 'string' } } },
  serverName: 'search-server',
};

const openAIWeatherTool = {
  type: 'function' as const,
  function: {
    name: 'get_weather',
    description: 'Get current weather',
    parameters: { type: 'object', properties: { city: { type: 'string' } } },
  },
};

const openAISearchTool = {
  type: 'function' as const,
  function: {
    name: 'web_search',
    description: 'Search the web',
    parameters: { type: 'object', properties: { query: { type: 'string' } } },
  },
};

/** Shared default options for toolAugmentedCompletion. */
function baseOpts(overrides?: Partial<Parameters<typeof toolAugmentedCompletion>[0]>) {
  return {
    botName: 'test-bot',
    llmProvider: { generateChatCompletion: jest.fn() },
    userMessage: 'Hello',
    historyMessages: [],
    metadata: {},
    systemPrompt: 'You are a helpful assistant.',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Tool-calling pipeline integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetMaxToolCalls.mockReturnValue(5);
  });

  // -----------------------------------------------------------------------
  // 1. Single tool call flow
  // -----------------------------------------------------------------------
  describe('single tool call flow', () => {
    test('discovers tools, sends to LLM, executes tool, feeds result, returns final response', async () => {
      // ToolManager returns one tool.
      mockGetToolsForBot.mockResolvedValue([WEATHER_TOOL]);
      mockFormatToolsForLLM.mockReturnValue([openAIWeatherTool]);

      // First LLM call: model calls the tool.
      mockOpenAICreate.mockResolvedValueOnce(
        toolCallResponse([{ id: 'call_1', name: 'get_weather', args: { city: 'Paris' } }])
      );

      // Tool execution succeeds.
      mockExecuteTool.mockResolvedValueOnce({
        toolName: 'get_weather',
        success: true,
        result: '22°C, sunny',
      });

      // Second LLM call: model produces final text.
      mockOpenAICreate.mockResolvedValueOnce(
        textResponse('The weather in Paris is 22°C and sunny.')
      );

      const result = await toolAugmentedCompletion(baseOpts({ userMessage: 'Weather in Paris?' }));

      expect(result).toBe('The weather in Paris is 22°C and sunny.');

      // Tools were sent in the first LLM call.
      expect(mockOpenAICreate).toHaveBeenCalledTimes(2);
      const firstCallArgs = mockOpenAICreate.mock.calls[0][0];
      expect(firstCallArgs.tools).toEqual([openAIWeatherTool]);
      expect(firstCallArgs.tool_choice).toBe('auto');

      // Tool was executed with the right arguments.
      expect(mockExecuteTool).toHaveBeenCalledTimes(1);
      expect(mockExecuteTool).toHaveBeenCalledWith(
        'test-bot',
        'get_weather',
        { city: 'Paris' },
        undefined
      );

      // Second LLM call included the tool result in messages.
      const secondCallMessages = mockOpenAICreate.mock.calls[1][0].messages;
      const toolResultMsg = secondCallMessages.find((m: any) => m.role === 'tool');
      expect(toolResultMsg).not.toBeUndefined();
      expect(toolResultMsg.content).toBe('22°C, sunny');
      expect(toolResultMsg.tool_call_id).toBe('call_1');
    });
  });

  // -----------------------------------------------------------------------
  // 2. Multi-tool call in single turn
  // -----------------------------------------------------------------------
  describe('multi-tool call in single turn', () => {
    test('executes two tools from one LLM response and feeds both results back', async () => {
      mockGetToolsForBot.mockResolvedValue([WEATHER_TOOL, SEARCH_TOOL]);
      mockFormatToolsForLLM.mockReturnValue([openAIWeatherTool, openAISearchTool]);

      // LLM requests two tool calls at once.
      mockOpenAICreate.mockResolvedValueOnce(
        toolCallResponse([
          { id: 'call_w', name: 'get_weather', args: { city: 'Tokyo' } },
          { id: 'call_s', name: 'web_search', args: { query: 'Tokyo events' } },
        ])
      );

      // Both tools succeed.
      mockExecuteTool
        .mockResolvedValueOnce({ toolName: 'get_weather', success: true, result: '18°C, cloudy' })
        .mockResolvedValueOnce({
          toolName: 'web_search',
          success: true,
          result: { content: [{ type: 'text', text: 'Cherry blossom festival this weekend' }] },
        });

      // Final LLM call returns text.
      mockOpenAICreate.mockResolvedValueOnce(
        textResponse('Tokyo is 18°C and cloudy. Cherry blossom festival this weekend!')
      );

      const result = await toolAugmentedCompletion(baseOpts({ userMessage: 'Tokyo update' }));

      expect(result).toBe('Tokyo is 18°C and cloudy. Cherry blossom festival this weekend!');
      expect(mockExecuteTool).toHaveBeenCalledTimes(2);
      expect(mockOpenAICreate).toHaveBeenCalledTimes(2);

      // Both tool results are in the follow-up messages.
      const followUpMessages = mockOpenAICreate.mock.calls[1][0].messages;
      const toolMessages = followUpMessages.filter((m: any) => m.role === 'tool');
      expect(toolMessages).toHaveLength(2);
      expect(toolMessages[0].tool_call_id).toBe('call_w');
      expect(toolMessages[1].tool_call_id).toBe('call_s');
    });
  });

  // -----------------------------------------------------------------------
  // 3. Multi-turn tool calling
  // -----------------------------------------------------------------------
  describe('multi-turn tool calling', () => {
    test('handles sequential tool calls across multiple turns', async () => {
      mockGetToolsForBot.mockResolvedValue([WEATHER_TOOL, SEARCH_TOOL]);
      mockFormatToolsForLLM.mockReturnValue([openAIWeatherTool, openAISearchTool]);

      // Turn 1: LLM calls tool A.
      mockOpenAICreate.mockResolvedValueOnce(
        toolCallResponse([{ id: 'call_a', name: 'get_weather', args: { city: 'London' } }])
      );
      mockExecuteTool.mockResolvedValueOnce({
        toolName: 'get_weather',
        success: true,
        result: '10°C, rain',
      });

      // Turn 2: LLM calls tool B using info from tool A's result.
      mockOpenAICreate.mockResolvedValueOnce(
        toolCallResponse([
          { id: 'call_b', name: 'web_search', args: { query: 'indoor activities London rain' } },
        ])
      );
      mockExecuteTool.mockResolvedValueOnce({
        toolName: 'web_search',
        success: true,
        result: 'Visit the British Museum',
      });

      // Turn 3: LLM produces final text.
      mockOpenAICreate.mockResolvedValueOnce(
        textResponse("It's rainy in London. Visit the British Museum!")
      );

      const result = await toolAugmentedCompletion(baseOpts({ userMessage: 'Plan my London day' }));

      expect(result).toBe("It's rainy in London. Visit the British Museum!");
      expect(mockOpenAICreate).toHaveBeenCalledTimes(3);
      expect(mockExecuteTool).toHaveBeenCalledTimes(2);
    });
  });

  // -----------------------------------------------------------------------
  // 4. Max iterations cap (5)
  // -----------------------------------------------------------------------
  describe('max iterations cap', () => {
    test('stops after 5 tool-calling iterations and returns a final response', async () => {
      mockGetToolsForBot.mockResolvedValue([WEATHER_TOOL]);
      mockFormatToolsForLLM.mockReturnValue([openAIWeatherTool]);
      mockGetMaxToolCalls.mockReturnValue(5);

      // The LLM stubbornly keeps calling tools every turn.
      for (let i = 0; i < 5; i++) {
        mockOpenAICreate.mockResolvedValueOnce(
          toolCallResponse([{ id: `call_${i}`, name: 'get_weather', args: { city: 'Loop' } }])
        );
        mockExecuteTool.mockResolvedValueOnce({
          toolName: 'get_weather',
          success: true,
          result: `iteration ${i}`,
        });
      }

      // After 5 iterations the code makes one final call WITHOUT tools.
      mockOpenAICreate.mockResolvedValueOnce(textResponse('Okay, I will stop calling tools now.'));

      const result = await toolAugmentedCompletion(baseOpts({ userMessage: 'Loop test' }));

      expect(result).toBe('Okay, I will stop calling tools now.');

      // 5 tool-calling iterations + 1 final = 6 LLM calls.
      expect(mockOpenAICreate).toHaveBeenCalledTimes(6);
      expect(mockExecuteTool).toHaveBeenCalledTimes(5);

      // The final call should have NO tools (empty array).
      const lastCallArgs = mockOpenAICreate.mock.calls[5][0];
      expect(lastCallArgs.tools).toBeUndefined();
    });
  });

  // -----------------------------------------------------------------------
  // 5. No tools available — falls back to plain completion
  // -----------------------------------------------------------------------
  describe('no tools available', () => {
    test('calls plain generateChatCompletion when bot has no tools', async () => {
      mockGetToolsForBot.mockResolvedValue([]);

      const mockGenerate = jest.fn().mockResolvedValue('Plain response');
      const opts = baseOpts({
        llmProvider: { generateChatCompletion: mockGenerate },
        userMessage: 'No tools here',
      });

      const result = await toolAugmentedCompletion(opts);

      expect(result).toBe('Plain response');

      // LLM was called through the standard path, NOT the OpenAI SDK.
      expect(mockOpenAICreate).not.toHaveBeenCalled();
      expect(mockGenerate).toHaveBeenCalledTimes(1);
      expect(mockGenerate).toHaveBeenCalledWith('No tools here', [], {});
    });
  });

  // -----------------------------------------------------------------------
  // 6. Tool execution failure
  // -----------------------------------------------------------------------
  describe('tool execution failure', () => {
    test('feeds error back to LLM and still produces a final response', async () => {
      mockGetToolsForBot.mockResolvedValue([WEATHER_TOOL]);
      mockFormatToolsForLLM.mockReturnValue([openAIWeatherTool]);

      // LLM calls the tool.
      mockOpenAICreate.mockResolvedValueOnce(
        toolCallResponse([{ id: 'call_err', name: 'get_weather', args: { city: 'Nowhere' } }])
      );

      // Tool execution fails.
      mockExecuteTool.mockResolvedValueOnce({
        toolName: 'get_weather',
        success: false,
        error: 'City not found in weather database',
      });

      // LLM handles the error gracefully.
      mockOpenAICreate.mockResolvedValueOnce(
        textResponse("I couldn't find weather data for that location.")
      );

      const result = await toolAugmentedCompletion(baseOpts({ userMessage: 'Weather in Nowhere' }));

      expect(result).toBe("I couldn't find weather data for that location.");

      // The error was fed back to the LLM as a tool result message.
      const followUpMessages = mockOpenAICreate.mock.calls[1][0].messages;
      const toolMsg = followUpMessages.find((m: any) => m.role === 'tool');
      expect(toolMsg).not.toBeUndefined();
      expect(toolMsg.content).toContain('City not found in weather database');
      expect(toolMsg.tool_call_id).toBe('call_err');
    });
  });

  // -----------------------------------------------------------------------
  // 7. Tool execution timeout
  // -----------------------------------------------------------------------
  describe('tool execution timeout', () => {
    test('feeds timeout error back to LLM and pipeline continues', async () => {
      mockGetToolsForBot.mockResolvedValue([WEATHER_TOOL]);
      mockFormatToolsForLLM.mockReturnValue([openAIWeatherTool]);

      // LLM calls the tool.
      mockOpenAICreate.mockResolvedValueOnce(
        toolCallResponse([{ id: 'call_to', name: 'get_weather', args: { city: 'Slow' } }])
      );

      // Tool execution times out (simulated by ToolManager returning a timeout error).
      mockExecuteTool.mockResolvedValueOnce({
        toolName: 'get_weather',
        success: false,
        error: 'Tool "get_weather" timed out after 30000ms',
      });

      // LLM recovers.
      mockOpenAICreate.mockResolvedValueOnce(
        textResponse('The weather service is currently unavailable. Please try again later.')
      );

      const result = await toolAugmentedCompletion(baseOpts({ userMessage: 'Slow weather' }));

      expect(result).toBe('The weather service is currently unavailable. Please try again later.');

      // Timeout error was fed back.
      const followUpMessages = mockOpenAICreate.mock.calls[1][0].messages;
      const toolMsg = followUpMessages.find((m: any) => m.role === 'tool');
      expect(toolMsg.content).toContain('timed out');
    });
  });

  // -----------------------------------------------------------------------
  // 8. LLM doesn't call tools despite having them
  // -----------------------------------------------------------------------
  describe('LLM does not call tools', () => {
    test('returns response directly when LLM produces plain text with no tool calls', async () => {
      mockGetToolsForBot.mockResolvedValue([WEATHER_TOOL]);
      mockFormatToolsForLLM.mockReturnValue([openAIWeatherTool]);

      // LLM responds with plain text, no tool_calls.
      mockOpenAICreate.mockResolvedValueOnce(
        textResponse('I already know the answer. No tools needed.')
      );

      const result = await toolAugmentedCompletion(baseOpts({ userMessage: 'Simple question' }));

      expect(result).toBe('I already know the answer. No tools needed.');

      // Only one LLM call — no extra iterations.
      expect(mockOpenAICreate).toHaveBeenCalledTimes(1);
      expect(mockExecuteTool).not.toHaveBeenCalled();
    });
  });
});
