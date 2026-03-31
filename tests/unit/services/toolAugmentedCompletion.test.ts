import { toolAugmentedCompletion } from '@src/services/toolAugmentedCompletion';

/**
 * Tests for toolAugmentedCompletion — the tool-use loop that wraps LLM calls.
 *
 * We mock ToolManager and the OpenAI SDK so tests stay fast and deterministic.
 */

// ---------------------------------------------------------------------------
// Mocks — must be set up before importing the module under test.
// ---------------------------------------------------------------------------

const mockGetToolsForBot = jest.fn();
const mockFormatToolsForLLM = jest.fn();
const mockExecuteTool = jest.fn();
const mockGetMaxToolCalls = jest.fn().mockReturnValue(5);

jest.mock('@src/services/ToolManager', () => ({
  ToolManager: {
    getInstance: () => ({
      getToolsForBot: mockGetToolsForBot,
      formatToolsForLLM: mockFormatToolsForLLM,
      executeTool: mockExecuteTool,
      getMaxToolCalls: mockGetMaxToolCalls,
    }),
  },
}));

// Mock the OpenAI SDK — the module calls `require('openai')` dynamically.
const mockCreate = jest.fn();
jest.mock('openai', () => ({
  OpenAI: jest.fn().mockImplementation(() => ({
    chat: { completions: { create: mockCreate } },
  })),
}));

// Mock openaiConfig — required by callLLMWithTools.
jest.mock('@config/openaiConfig', () => ({
  __esModule: true,
  default: {
    get: jest.fn().mockReturnValue(undefined),
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function baseLLMProvider() {
  return {
    generateChatCompletion: jest.fn().mockResolvedValue('plain response'),
  };
}

function baseOpts(overrides?: Record<string, any>) {
  return {
    botName: 'bot1',
    llmProvider: baseLLMProvider(),
    userMessage: 'Hello',
    historyMessages: [],
    metadata: {},
    systemPrompt: 'You are a helpful assistant.',
    ...overrides,
  };
}

function chatResponse(content: string | null, tool_calls?: any[]) {
  return {
    choices: [
      {
        message: {
          content,
          tool_calls: tool_calls || undefined,
        },
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('toolAugmentedCompletion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset environment variables that callLLMWithTools might read.
    delete process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_BASE_URL;
    delete process.env.OPENAI_MODEL;
  });

  // === No tools → passthrough ===

  describe('when no tools are available', () => {
    it('falls back to plain generateChatCompletion', async () => {
      mockGetToolsForBot.mockResolvedValue([]);

      const opts = baseOpts();
      const result = await toolAugmentedCompletion(opts);

      expect(result).toBe('plain response');
      expect(opts.llmProvider.generateChatCompletion).toHaveBeenCalledWith('Hello', [], {});
      expect(mockCreate).not.toHaveBeenCalled();
    });
  });

  // === Tools available, LLM doesn't call any ===

  describe('when tools are available but LLM returns text only', () => {
    it('returns the text response without executing tools', async () => {
      mockGetToolsForBot.mockResolvedValue([
        { name: 'search', description: 'S', parameters: {}, serverName: 'srv' },
      ]);
      mockFormatToolsForLLM.mockReturnValue([
        { type: 'function', function: { name: 'search', description: 'S', parameters: {} } },
      ]);
      mockCreate.mockResolvedValue(chatResponse('I can help with that!'));

      const result = await toolAugmentedCompletion(baseOpts());

      expect(result).toBe('I can help with that!');
      expect(mockExecuteTool).not.toHaveBeenCalled();
    });
  });

  // === LLM calls one tool ===

  describe('when LLM calls one tool', () => {
    it('executes the tool, feeds result back, and returns final response', async () => {
      mockGetToolsForBot.mockResolvedValue([
        { name: 'search', description: 'S', parameters: {}, serverName: 'srv' },
      ]);
      mockFormatToolsForLLM.mockReturnValue([
        { type: 'function', function: { name: 'search', description: 'S', parameters: {} } },
      ]);

      // First call: LLM requests a tool call.
      mockCreate.mockResolvedValueOnce(
        chatResponse(null, [
          {
            id: 'call_1',
            type: 'function',
            function: { name: 'search', arguments: '{"query":"test"}' },
          },
        ])
      );

      // Tool execution result.
      mockExecuteTool.mockResolvedValue({
        toolName: 'search',
        success: true,
        result: 'Found 3 results',
      });

      // Second call: LLM returns final text.
      mockCreate.mockResolvedValueOnce(chatResponse('Based on search results...'));

      const result = await toolAugmentedCompletion(baseOpts());

      expect(result).toBe('Based on search results...');
      expect(mockExecuteTool).toHaveBeenCalledTimes(1);
      expect(mockExecuteTool).toHaveBeenCalledWith('bot1', 'search', { query: 'test' }, undefined);
      expect(mockCreate).toHaveBeenCalledTimes(2);
    });
  });

  // === LLM calls multiple tools in one turn ===

  describe('when LLM calls multiple tools', () => {
    it('executes all tool calls and feeds results back', async () => {
      mockGetToolsForBot.mockResolvedValue([
        { name: 'search', description: 'S', parameters: {}, serverName: 'srv' },
        { name: 'fetch', description: 'F', parameters: {}, serverName: 'srv' },
      ]);
      mockFormatToolsForLLM.mockReturnValue([]);

      mockCreate.mockResolvedValueOnce(
        chatResponse(null, [
          { id: 'c1', type: 'function', function: { name: 'search', arguments: '{}' } },
          { id: 'c2', type: 'function', function: { name: 'fetch', arguments: '{}' } },
        ])
      );

      mockExecuteTool
        .mockResolvedValueOnce({ toolName: 'search', success: true, result: 'r1' })
        .mockResolvedValueOnce({ toolName: 'fetch', success: true, result: 'r2' });

      mockCreate.mockResolvedValueOnce(chatResponse('Combined results'));

      const result = await toolAugmentedCompletion(baseOpts());

      expect(result).toBe('Combined results');
      expect(mockExecuteTool).toHaveBeenCalledTimes(2);
    });
  });

  // === Multi-turn tool use ===

  describe('multi-turn: LLM calls tool, gets result, calls another tool', () => {
    it('loops until LLM returns text', async () => {
      mockGetToolsForBot.mockResolvedValue([
        { name: 'search', description: 'S', parameters: {}, serverName: 'srv' },
      ]);
      mockFormatToolsForLLM.mockReturnValue([]);

      // Turn 1: tool call.
      mockCreate.mockResolvedValueOnce(
        chatResponse(null, [
          { id: 'c1', type: 'function', function: { name: 'search', arguments: '{"q":"a"}' } },
        ])
      );
      mockExecuteTool.mockResolvedValueOnce({
        toolName: 'search',
        success: true,
        result: 'partial',
      });

      // Turn 2: another tool call.
      mockCreate.mockResolvedValueOnce(
        chatResponse(null, [
          { id: 'c2', type: 'function', function: { name: 'search', arguments: '{"q":"b"}' } },
        ])
      );
      mockExecuteTool.mockResolvedValueOnce({ toolName: 'search', success: true, result: 'more' });

      // Turn 3: final text.
      mockCreate.mockResolvedValueOnce(chatResponse('Done!'));

      const result = await toolAugmentedCompletion(baseOpts());

      expect(result).toBe('Done!');
      expect(mockCreate).toHaveBeenCalledTimes(3);
      expect(mockExecuteTool).toHaveBeenCalledTimes(2);
    });
  });

  // === Tool execution fails ===

  describe('when tool execution fails', () => {
    it('feeds error back to LLM and continues', async () => {
      mockGetToolsForBot.mockResolvedValue([
        { name: 'search', description: 'S', parameters: {}, serverName: 'srv' },
      ]);
      mockFormatToolsForLLM.mockReturnValue([]);

      mockCreate.mockResolvedValueOnce(
        chatResponse(null, [
          { id: 'c1', type: 'function', function: { name: 'search', arguments: '{}' } },
        ])
      );

      mockExecuteTool.mockResolvedValue({
        toolName: 'search',
        success: false,
        error: 'Server unavailable',
      });

      // LLM handles the error gracefully.
      mockCreate.mockResolvedValueOnce(chatResponse('Sorry, search is down.'));

      const result = await toolAugmentedCompletion(baseOpts());

      expect(result).toBe('Sorry, search is down.');
      // Verify the error was passed back in the tool message.
      const secondCall = mockCreate.mock.calls[1][0];
      const toolMessage = secondCall.messages.find((m: any) => m.role === 'tool');
      expect(toolMessage.content).toContain('Server unavailable');
    });
  });

  // === Max iterations reached ===

  describe('when max iterations (5) reached', () => {
    it('makes a final call without tools to get a text reply', async () => {
      mockGetToolsForBot.mockResolvedValue([
        { name: 'tool1', description: 'T', parameters: {}, serverName: 'srv' },
      ]);
      mockFormatToolsForLLM.mockReturnValue([
        { type: 'function', function: { name: 'tool1', description: 'T', parameters: {} } },
      ]);
      mockGetMaxToolCalls.mockReturnValue(2); // Lower cap for test speed.

      // Every call returns a tool call.
      mockCreate.mockResolvedValue(
        chatResponse(null, [
          { id: 'cx', type: 'function', function: { name: 'tool1', arguments: '{}' } },
        ])
      );
      mockExecuteTool.mockResolvedValue({ toolName: 'tool1', success: true, result: 'ok' });

      // Override the last call to return text (simulating the "final call without tools").
      // After 2 iterations, it makes one more call with tools=[]
      const totalCalls = 2 + 1; // 2 iterations + 1 final
      let callCount = 0;
      mockCreate.mockImplementation(async (body: any) => {
        callCount++;
        if (callCount <= 2) {
          return chatResponse(null, [
            { id: `c${callCount}`, type: 'function', function: { name: 'tool1', arguments: '{}' } },
          ]);
        }
        return chatResponse('Final answer after cap');
      });

      const result = await toolAugmentedCompletion(baseOpts());

      expect(result).toBe('Final answer after cap');
      expect(mockCreate).toHaveBeenCalledTimes(3);
      // The final call should omit tools (code only adds `tools` when length > 0).
      const lastCallArgs = mockCreate.mock.calls[2][0];
      expect(lastCallArgs.tools).toBeUndefined();
    });
  });

  // === LLM provider error ===

  describe('when LLM provider errors during tool flow', () => {
    it('returns empty string on OpenAI SDK error (caught internally)', async () => {
      mockGetToolsForBot.mockResolvedValue([
        { name: 'tool1', description: 'T', parameters: {}, serverName: 'srv' },
      ]);
      mockFormatToolsForLLM.mockReturnValue([]);

      mockCreate.mockRejectedValue(new Error('API key invalid'));

      const result = await toolAugmentedCompletion(baseOpts());

      // callLLMWithTools catches the error and returns { content: '' }.
      expect(result).toBe('');
    });
  });

  // === History messages ===

  describe('history message handling', () => {
    it('converts history messages with getText() to chat messages', async () => {
      mockGetToolsForBot.mockResolvedValue([
        { name: 'tool1', description: 'T', parameters: {}, serverName: 'srv' },
      ]);
      mockFormatToolsForLLM.mockReturnValue([]);
      mockCreate.mockResolvedValue(chatResponse('reply'));

      const history = [
        { role: 'user', getText: () => 'previous message' },
        { role: 'assistant', getText: () => 'previous reply' },
      ];

      await toolAugmentedCompletion(baseOpts({ historyMessages: history }));

      const messages = mockCreate.mock.calls[0][0].messages;
      expect(messages).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ role: 'user', content: 'previous message' }),
          expect.objectContaining({ role: 'assistant', content: 'previous reply' }),
        ])
      );
    });

    it('skips malformed history entries gracefully', async () => {
      mockGetToolsForBot.mockResolvedValue([
        { name: 'tool1', description: 'T', parameters: {}, serverName: 'srv' },
      ]);
      mockFormatToolsForLLM.mockReturnValue([]);
      mockCreate.mockResolvedValue(chatResponse('reply'));

      const history = [
        null, // malformed
        {
          getText: () => {
            throw new Error('broken');
          },
        },
      ];

      // Should not throw.
      const result = await toolAugmentedCompletion(baseOpts({ historyMessages: history }));
      expect(result).toBe('reply');
    });
  });

  // === System prompt ===

  describe('system prompt handling', () => {
    it('includes system prompt as first message', async () => {
      mockGetToolsForBot.mockResolvedValue([
        { name: 'tool1', description: 'T', parameters: {}, serverName: 'srv' },
      ]);
      mockFormatToolsForLLM.mockReturnValue([]);
      mockCreate.mockResolvedValue(chatResponse('reply'));

      await toolAugmentedCompletion(baseOpts({ systemPrompt: 'Be helpful.' }));

      const messages = mockCreate.mock.calls[0][0].messages;
      expect(messages[0]).toEqual({ role: 'system', content: 'Be helpful.' });
    });

    it('omits system message when systemPrompt is empty', async () => {
      mockGetToolsForBot.mockResolvedValue([
        { name: 'tool1', description: 'T', parameters: {}, serverName: 'srv' },
      ]);
      mockFormatToolsForLLM.mockReturnValue([]);
      mockCreate.mockResolvedValue(chatResponse('reply'));

      await toolAugmentedCompletion(baseOpts({ systemPrompt: '' }));

      const messages = mockCreate.mock.calls[0][0].messages;
      expect(messages[0].role).not.toBe('system');
    });
  });

  // === Tool result formatting ===

  describe('tool result formatting', () => {
    it('handles MCP-style content array results', async () => {
      mockGetToolsForBot.mockResolvedValue([
        { name: 'tool1', description: 'T', parameters: {}, serverName: 'srv' },
      ]);
      mockFormatToolsForLLM.mockReturnValue([]);

      mockCreate.mockResolvedValueOnce(
        chatResponse(null, [
          { id: 'c1', type: 'function', function: { name: 'tool1', arguments: '{}' } },
        ])
      );

      mockExecuteTool.mockResolvedValue({
        toolName: 'tool1',
        success: true,
        result: {
          content: [
            { type: 'text', text: 'line1' },
            { type: 'text', text: 'line2' },
          ],
        },
      });

      mockCreate.mockResolvedValueOnce(chatResponse('Got it'));

      await toolAugmentedCompletion(baseOpts());

      const secondCall = mockCreate.mock.calls[1][0];
      const toolMsg = secondCall.messages.find((m: any) => m.role === 'tool');
      expect(toolMsg.content).toBe('line1\nline2');
    });

    it('handles plain object results via JSON.stringify', async () => {
      mockGetToolsForBot.mockResolvedValue([
        { name: 'tool1', description: 'T', parameters: {}, serverName: 'srv' },
      ]);
      mockFormatToolsForLLM.mockReturnValue([]);

      mockCreate.mockResolvedValueOnce(
        chatResponse(null, [
          { id: 'c1', type: 'function', function: { name: 'tool1', arguments: '{}' } },
        ])
      );

      mockExecuteTool.mockResolvedValue({
        toolName: 'tool1',
        success: true,
        result: { data: 42 },
      });

      mockCreate.mockResolvedValueOnce(chatResponse('Got it'));

      await toolAugmentedCompletion(baseOpts());

      const secondCall = mockCreate.mock.calls[1][0];
      const toolMsg = secondCall.messages.find((m: any) => m.role === 'tool');
      expect(toolMsg.content).toBe('{"data":42}');
    });

    it('handles malformed tool arguments', async () => {
      mockGetToolsForBot.mockResolvedValue([
        { name: 'tool1', description: 'T', parameters: {}, serverName: 'srv' },
      ]);
      mockFormatToolsForLLM.mockReturnValue([]);

      mockCreate.mockResolvedValueOnce(
        chatResponse(null, [
          { id: 'c1', type: 'function', function: { name: 'tool1', arguments: 'not-json' } },
        ])
      );

      // Should not call executeTool, should return error to LLM.
      mockCreate.mockResolvedValueOnce(chatResponse('Invalid args'));

      const result = await toolAugmentedCompletion(baseOpts());

      expect(result).toBe('Invalid args');
      expect(mockExecuteTool).not.toHaveBeenCalled();
    });
  });

  // === toolContext forwarding ===

  describe('toolContext forwarding', () => {
    it('passes toolContext to executeTool', async () => {
      mockGetToolsForBot.mockResolvedValue([
        { name: 'tool1', description: 'T', parameters: {}, serverName: 'srv' },
      ]);
      mockFormatToolsForLLM.mockReturnValue([]);

      mockCreate.mockResolvedValueOnce(
        chatResponse(null, [
          { id: 'c1', type: 'function', function: { name: 'tool1', arguments: '{}' } },
        ])
      );
      mockExecuteTool.mockResolvedValue({ toolName: 'tool1', success: true, result: 'ok' });
      mockCreate.mockResolvedValueOnce(chatResponse('Done'));

      const ctx = { userId: 'u1', channelId: 'ch1', messageProvider: 'discord' };
      await toolAugmentedCompletion(baseOpts({ toolContext: ctx }));

      expect(mockExecuteTool).toHaveBeenCalledWith('bot1', 'tool1', {}, ctx);
    });
  });
});
